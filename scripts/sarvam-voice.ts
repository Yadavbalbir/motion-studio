import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Reel } from "../src/model";
import { fileHash, generated, manifestSchema, probe, run, voiceKey } from "./lib";
import { narrationRequest, synthesizeNarration } from "./sarvam";

async function exists(filename: string) {
  try { await access(filename); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function assertTrialBudget(reel: Reel) {
  const requests = reel.format === "short" ? 8 : 18;
  if (reel.beats.length > requests || reel.beats.reduce((sum, beat) => sum + [...beat.speech].length, 0) > requests * 300) {
    throw new Error(`Trial ${reel.format} narration is capped at ${requests} requests and ${requests * 300} characters.`);
  }
  for (const beat of reel.beats) narrationRequest(beat.speech);
}

const receiptSchema = z.object({
  status: z.literal("complete"),
  requestHash: z.string(),
  sourceHash: z.string(),
});

export async function generateSarvam(reel: Reel, key: string | undefined) {
  assertTrialBudget(reel);
  const directory = path.join(generated(reel.slug), "audio");
  await mkdir(directory, { recursive: true });
  const manifestPath = path.join(directory, "manifest.json");
  const manifest = await exists(manifestPath)
    ? manifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")))
    : { engine: "sarvam-shubh-v1" as const, beats: {} as z.infer<typeof manifestSchema>["beats"] };
  if (manifest.engine !== "sarvam-shubh-v1") throw new Error("Existing narration uses a different engine; use a separate reel slug.");
  const work = [];
  for (const beat of reel.beats) {
    const requestHash = createHash("sha256").update(JSON.stringify(narrationRequest(beat.speech))).digest("hex");
    const receiptPath = path.join(directory, `${beat.id}.sarvam.json`);
    const sourcePath = path.join(directory, `${beat.id}.source.wav`);
    const output = path.join(directory, `${beat.id}.wav`);
    const cached = await exists(receiptPath);
    if (cached) {
      const parsed = receiptSchema.safeParse(JSON.parse(await readFile(receiptPath, "utf8")));
      if (!parsed.success) throw new Error(`Incomplete request for ${beat.id}. Check the provider dashboard; no automatic retry.`);
      if (parsed.data.requestHash !== requestHash || !await exists(sourcePath) ||
          parsed.data.sourceHash !== await fileHash(sourcePath)) {
        throw new Error(`Source cache changed for ${beat.id}. Stopping before spending more credits.`);
      }
    } else if (await exists(sourcePath) || await exists(output)) {
      throw new Error(`Audio without a request receipt for ${beat.id}. Stopping before API usage.`);
    }
    work.push({ beat, requestHash, receiptPath, sourcePath, output, cached });
  }
  const requests = work.filter((item) => !item.cached).length;
  if (requests && !key) throw new Error("SARVAM_API_KEY is missing. Supply it in the process environment.");
  console.log(`Trial narration: ${requests} new requests; no retries, top-ups, or paid fallback.`);
  for (const item of work) {
    if (!item.cached) {
      await writeFile(item.receiptPath, JSON.stringify({ status: "started", requestHash: item.requestHash }), { flag: "wx" });
      const audio = await synthesizeNarration(key!, item.beat.speech);
      await writeFile(item.sourcePath, audio, { flag: "wx" });
      const info = await probe(item.sourcePath);
      const stream = info.streams.find((entry) => entry.codec_type === "audio");
      const seconds = Number(info.format.duration);
      if (!stream || stream.sample_rate !== "48000" || !Number.isFinite(seconds) || seconds <= 0 || seconds > 25) {
        throw new Error(`Unexpected source audio for ${item.beat.id}; no retry.`);
      }
      await writeFile(item.receiptPath, JSON.stringify({
        status: "complete", requestHash: item.requestHash, sourceHash: await fileHash(item.sourcePath),
      }, null, 2) + "\n");
    }
    const keyHash = voiceKey(reel, item.beat.speech);
    const old = manifest.beats[item.beat.id];
    if (old?.key === keyHash && await exists(item.output) && old.sha256 === await fileHash(item.output)) {
      console.log(`Reused ${item.beat.id}; no API call or audio processing.`);
      continue;
    }
    const temp = path.join(directory, `${item.beat.id}.processing.wav`);
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", item.sourcePath,
      "-af", `atempo=${reel.voice.speed}`, "-ar", "48000", "-c:a", "pcm_s16le", temp]);
    const info = await probe(temp);
    const seconds = Number(info.format.duration);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 20) throw new Error(`Invalid processed duration for ${item.beat.id}.`);
    await rename(temp, item.output);
    manifest.beats[item.beat.id] = { key: keyHash, sha256: await fileHash(item.output) };
    await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + "\n");
    await rename(`${manifestPath}.tmp`, manifestPath);
    console.log(`Ready ${item.beat.id}: ${seconds.toFixed(2)}s, Shubh at ${reel.voice.speed}x.`);
  }
}
