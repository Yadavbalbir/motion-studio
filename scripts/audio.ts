import path from "node:path";
import { FPS, type Timeline } from "../src/model";
import { run } from "./lib";
import { makeSoundtrack } from "./soundtrack";

export async function assembleNarration(timeline: Timeline, audioDirectory: string, directory: string): Promise<string> {
  const inputs = timeline.beats.flatMap((beat) => ["-i", path.join(audioDirectory, `${beat.id}.wav`)]);
  const filters = timeline.beats.map((beat, index) =>
    `[${index}:a]aresample=48000,apad=whole_dur=${beat.durationFrames / FPS},` +
    `atrim=duration=${beat.durationFrames / FPS},asetpts=PTS-STARTPTS[a${index}]`);
  filters.push(timeline.beats.map((_, index) => `[a${index}]`).join("") +
    `concat=n=${timeline.beats.length}:v=0:a=1[voice]`);
  const raw = path.join(directory, "voice-raw.wav");
  const normalized = path.join(directory, "voice.wav");
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs,
    "-filter_complex", filters.join(";"), "-map", "[voice]", "-ac", "1", "-c:a", "pcm_s16le", raw]);
  let mix = raw;
  const channels = timeline.reel.soundtrack === "ambient" ? 2 : 1;
  if (timeline.reel.soundtrack === "ambient") {
    const bed = path.join(directory, "original-soundtrack.wav");
    mix = path.join(directory, "voice-music-mix.wav");
    await makeSoundtrack(timeline, bed);
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-i", bed,
      "-filter_complex",
      "[0:a]asplit=2[voice][side];[1:a][side]sidechaincompress=threshold=0.06:ratio=2.5:attack=10:release=200[bed];" +
      "[voice][bed]amix=inputs=2:duration=first:normalize=0[mix]",
      "-map", "[mix]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", mix]);
  }
  const analysis = await run("ffmpeg", ["-hide_banner", "-i", mix,
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]);
  const match = analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw new Error("Could not measure voice loudness.");
  const stats = JSON.parse(match[0]) as Record<string, string>;
  for (const key of ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"]) {
    if (!Number.isFinite(Number(stats[key]))) throw new Error("Voice contains silence or invalid loudness measurements.");
  }
  const filter = `loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I=${stats.input_i}:` +
    `measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}`;
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", mix, "-af", filter, "-ar", "48000", "-ac", String(channels), normalized]);
  return normalized;
}
