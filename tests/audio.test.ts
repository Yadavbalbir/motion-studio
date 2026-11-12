import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { assembleNarration } from "../scripts/audio";
import { assertExport, probe, readReel, run } from "../scripts/lib";
import { makeTimeline } from "../src/model";

test("audio assembly, loudness normalization, and full-size H.264/AAC muxing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "reels-audio-test-"));
  try {
    const reel = await readReel("tap-pay-motion-pilot");
    reel.soundtrack = "none";
    reel.beats[0].pauseAfter = 0.4;
    const durations = [6.001, 9.1];
    const timeline = makeTimeline(reel, durations);
    for (const [index, beat] of reel.beats.entries()) {
      await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
        `sine=frequency=${300 + index * 120}:sample_rate=24000:duration=${durations[index]}`,
        path.join(directory, `${beat.id}.wav`)]);
    }
    const audio = await assembleNarration(timeline, directory, directory);
    const info = await probe(audio);
    assert.equal(info.streams[0].sample_rate, "48000");
    assert.ok(Math.abs(Number(info.format.duration) - timeline.totalFrames / 30) < 0.001);
    const measured = await run("ffmpeg", ["-hide_banner", "-i", audio, "-af",
      "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]);
    const measurement = measured.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
    assert.ok(measurement);
    const loudness = JSON.parse(measurement[0]) as Record<string, string>;
    assert.ok(Math.abs(Number(loudness.input_i) + 16) < 0.6);
    assert.ok(Number(loudness.input_tp) <= -1.4);
    timeline.reel.soundtrack = "ambient";
    await assembleNarration(timeline, directory, directory);
    const mixed = await probe(audio);
    assert.equal(mixed.streams[0].channels, 2);
    assert.ok(Math.abs(Number(mixed.format.duration) - timeline.totalFrames / 30) < 0.001);
    const bed = await readFile(path.join(directory, "original-soundtrack.wav"));
    let peak = 0;
    let energy = 0;
    for (let index = 44; index < bed.length; index += 2) {
      const sample = bed.readInt16LE(index) / 32768;
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
    }
    assert.ok(peak > 0.01 && peak < 0.99, "Original music and SFX must be audible without clipping.");
    assert.ok(energy > 0);
    const video = path.join(directory, "fixture.mp4");
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
      "color=c=black:s=1080x1920:r=30", "-i", audio, "-t", String(timeline.totalFrames / 30),
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "48000", "-movflags", "+faststart", video]);
    assertExport(await probe(video), timeline, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
