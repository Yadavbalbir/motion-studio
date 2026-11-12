import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import { FPS, HEIGHT, VOICE_ENGINE, WIDTH, groupCaptionCues, holdCaptions, makeTimeline, reelSchema, slugSchema, subtitles, type Beat, type Reel, type Timeline } from "../src/model";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const run = promisify(execFile);
export const generated = (slug: string) => path.join(ROOT, "public/generated", slugSchema.parse(slug));
export const source = (slug: string) => path.join(ROOT, "public/reels", `${slugSchema.parse(slug)}.json`);

export async function readReel(slug: string): Promise<Reel> {
  const reel = reelSchema.parse(JSON.parse(await readFile(source(slug), "utf8")));
  if (reel.slug !== slug) throw new Error("Reel slug must match its filename.");
  return reel;
}

export function voiceKey(reel: Reel, speech: string): string {
  const voice = reel.voice;
  return createHash("sha256").update(JSON.stringify([
    VOICE_ENGINE, voice.model, voice.speaker, "hi-IN", 1, 48000,
    "atempo", voice.speed.toFixed(2), speech,
  ])).digest("hex");
}

export async function fileHash(filename: string): Promise<string> {
  return createHash("sha256").update(await readFile(filename)).digest("hex");
}

export function captionKey(beat: Beat): string {
  return createHash("sha256").update(JSON.stringify(beat.captionSegments.map((part) => [part.speech, part.caption]))).digest("hex");
}

export const alignmentSchema = z.object({
  engine: z.literal("stable-ts-2.19.1-whisper-base"),
  beats: z.record(z.object({
    audioHash: z.string(),
    textHash: z.string(),
    cues: z.array(z.object({ start: z.number().finite().min(0), end: z.number().finite().positive(), text: z.string().min(1) })),
  })),
});

export const manifestSchema = z.object({
  engine: z.literal(VOICE_ENGINE),
  beats: z.record(z.object({
    key: z.string().regex(/^[a-f0-9]{64}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })),
});

export async function probe(filename: string) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", filename]);
  return JSON.parse(stdout) as MediaProbe;
}

export interface MediaProbe {
  streams: {
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    pix_fmt?: string;
    avg_frame_rate?: string;
    sample_rate?: string;
    channels?: number;
    duration?: string;
  }[];
  format: { duration: string };
}

export function assertExport(info: MediaProbe, timeline: Timeline, draft: boolean): void {
  const video = info.streams.find((stream) => stream.codec_type === "video");
  const audio = info.streams.find((stream) => stream.codec_type === "audio");
  if (!video || video.codec_name !== "h264" || video.width !== WIDTH / (draft ? 2 : 1) ||
      video.height !== HEIGHT / (draft ? 2 : 1) || video.pix_fmt !== "yuv420p" ||
      video.avg_frame_rate !== `${FPS}/1`) {
    throw new Error(`Export failed H.264, dimensions, pixel-format, or frame-rate checks: ${JSON.stringify(video)}.`);
  }
  const duration = Number(info.format.duration);
  if (!Number.isFinite(duration) || Math.abs(duration - timeline.totalFrames / FPS) > 0.15) {
    throw new Error("Export duration does not match the audio-timed storyboard.");
  }
  if (!timeline.silent && (!audio || audio.codec_name !== "aac" || audio.sample_rate !== "48000" ||
      !Number.isFinite(Number(audio.duration)) ||
      Math.abs(Number(audio.duration) - timeline.totalFrames / FPS) > 0.15)) {
    throw new Error("Narrated exports require a complete 48 kHz AAC track.");
  }
  if (timeline.silent && audio) throw new Error("A silent preview unexpectedly contains audio.");
}

export async function prepare(slug: string, silent: boolean): Promise<Timeline> {
  const reel = await readReel(slug);
  let durations: number[] | undefined;
  let alignment: z.infer<typeof alignmentSchema> | undefined;
  if (!silent) {
    const manifestFile = path.join(generated(slug), "audio/manifest.json");
    let text: string;
    try { text = await readFile(manifestFile, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      throw new Error(`Narration is missing. Run "npm run voice -- ${slug}" first, or explicitly use --silent-preview.`);
    }
    const manifest = manifestSchema.parse(JSON.parse(text));
    try {
      alignment = alignmentSchema.parse(JSON.parse(await readFile(path.join(generated(slug), "captions-aligned.json"), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Aligned captions are missing. Run "npm run captions -- ${slug}" first.`);
      throw error;
    }
    durations = [];
    for (const beat of reel.beats) {
      const entry = manifest.beats[beat.id];
      const filename = path.join(generated(slug), "audio", `${beat.id}.wav`);
      if (!entry || entry.key !== voiceKey(reel, beat.speech)) {
        throw new Error(`Narration is stale for ${beat.id}. Run voice generation again.`);
      }
      if (entry.sha256 !== await fileHash(filename)) throw new Error(`Audio changed outside the pipeline: ${beat.id}. Regenerate it.`);
      const aligned = alignment?.beats[beat.id];
      if (!aligned || aligned.audioHash !== entry.sha256 || aligned.textHash !== captionKey(beat) ||
          aligned.cues.map((cue) => cue.text).join(" ") !== beat.caption) {
        throw new Error(`Aligned captions are stale for ${beat.id}. Run "npm run captions -- ${slug}".`);
      }
      const info = await probe(filename);
      if (!info.streams.some((stream) => stream.codec_type === "audio")) throw new Error(`No audio in ${filename}.`);
      durations.push(Number(info.format.duration));
    }
  }
  const timeline = makeTimeline(reel, durations);
  for (const timed of timeline.beats) {
    const aligned = alignment?.beats[timed.id];
    if (!aligned) continue;
    timed.captions = aligned.cues.map((cue) => ({
      startFrame: Math.round(cue.start * FPS),
      endFrame: Math.min(timed.durationFrames, Math.round(cue.end * FPS)),
      text: cue.text,
    }));
    let end = 0;
    for (const cue of timed.captions) {
      if (cue.startFrame < end || cue.endFrame <= cue.startFrame || cue.endFrame > timed.durationFrames) {
        throw new Error(`Invalid caption timing for ${timed.id}; realign rather than estimating.`);
      }
      end = cue.endFrame;
    }
    timed.captions = holdCaptions(groupCaptionCues(timed.captions), timed.durationFrames);
  }
  await mkdir(generated(slug), { recursive: true });
  await writeFile(path.join(generated(slug), "timeline.json"), JSON.stringify(timeline, null, 2) + "\n");
  await writeFile(path.join(generated(slug), "captions.srt"), subtitles(timeline));
  await writeFile(path.join(generated(slug), "transcript.txt"),
    reel.beats.map((beat) => `${beat.chapter}\n${beat.caption}\nSpeech: ${beat.speech}`).join("\n\n") + "\n");
  await writeFile(path.join(generated(slug), "publishing.json"), JSON.stringify({
    ...reel.publishing,
    sources: reel.sources,
    status: silent ? "SILENT_STORYBOARD_NOT_FOR_PUBLISHING" :
      Object.values(reel.review).every(Boolean) ? "REVIEWED_READY_TO_EXPORT" : "REVIEW_REQUIRED",
    review: reel.review,
    captions: silent ? "Estimated storyboard captions; not aligned."
      : "Complete Roman Hinglish transcript; local Whisper forced alignment, grouped for readability. Caption ends may hold into existing gaps for reading; aligned starts are unchanged.",
    soundtrack: reel.soundtrack === "ambient"
      ? "Original locally synthesized stereo music and transition SFX; ducked under narration."
      : "None",
    voiceAttribution: `Sarvam Bulbul v4 Flash, Shubh, local pitch-preserving ${reel.voice.speed}x tempo; https://docs.sarvam.ai/api/getting-started/commercial-licensing`,
  }, null, 2) + "\n");
  return timeline;
}
