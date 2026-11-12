import assert from "node:assert/strict";
import test from "node:test";
import { assertPublishable, beatAt, groupCaptionCues, holdCaptions, makeTimeline, reelSchema, slugSchema, subtitles } from "../src/model";
import { assertExport, readReel, voiceKey, type MediaProbe } from "../scripts/lib";

const example = await readReel("sql-vs-nosql");
const n = example.beats.length;

test("example is a complete, validated storyboard", () => {
  const timeline = makeTimeline(example);
  assert.equal(timeline.silent, true);
  assert.equal(timeline.totalFrames, example.beats.reduce((sum, beat) => sum + Math.ceil(beat.seconds * 30), 0));
});

test("slug validation prevents traversal and ambiguous paths", () => {
  for (const bad of ["../secret", "", "foo/bar", "UPPER", "foo.wav", "a--b"]) {
    assert.equal(slugSchema.safeParse(bad).success, false);
  }
});

test("duplicate IDs, mixed motion families and incomplete captions fail", () => {
  const duplicate = structuredClone(example);
  duplicate.beats[1].id = duplicate.beats[0].id;
  assert.equal(reelSchema.safeParse(duplicate).success, false);
  const mixed = structuredClone(example);
  mixed.beats[1].visual = "tap-motion";
  assert.equal(reelSchema.safeParse(mixed).success, false);
  const incomplete = structuredClone(example);
  incomplete.beats[0].captionSegments.pop();
  assert.equal(reelSchema.safeParse(incomplete).success, false);
});

test("timing uses measured audio with frame rounding and no overlaps", () => {
  const timeline = makeTimeline({ ...example, beats: example.beats.map((beat) => ({ ...beat, pauseAfter: 0 })) },
    example.beats.map(() => 6.001));
  assert.equal(timeline.beats[0].durationFrames, 181);
  for (let index = 1; index < n; index++) assert.equal(timeline.beats[index].startFrame, index * 181);
  assert.equal(beatAt(timeline, 180), 0);
  assert.equal(beatAt(timeline, 181), 1);
  assert.equal(beatAt(timeline, -1), 0);
  assert.equal(beatAt(timeline, 99999), n - 1);
  assert.throws(() => beatAt(timeline, NaN));
  assert.throws(() => makeTimeline(example, [3]));
  assert.throws(() => makeTimeline(example, example.beats.map(() => NaN)));
  assert.throws(() => makeTimeline(example, example.beats.map(() => 0.1)), /15-90/);
  assert.throws(() => makeTimeline(example, example.beats.map(() => 15)));
});

test("aligned captions group for readability, hold into gaps and export exact SRT timing", () => {
  const timeline = makeTimeline(example);
  timeline.beats[0].captions = holdCaptions(groupCaptionCues([
    { startFrame: 3, endFrame: 40, text: "First spoken group." },
    { startFrame: 45, endFrame: 60, text: "Final words." },
  ]), timeline.beats[0].durationFrames);
  assert.deepEqual(timeline.beats[0].captions, [{ startFrame: 3, endFrame: 60, text: "First spoken group. Final words." }]);
  assert.match(subtitles(timeline), /00:00:00,100 --> 00:00:02,000\nFirst spoken group\. Final words\./);
  assert.throws(() => holdCaptions([{ startFrame: 0, endFrame: 5, text: "one two three four five six" },
    { startFrame: 10, endFrame: 20, text: "next" }], 30), /reading time/);
});

test("publish gate rejects silence, unreviewed content, missing and unreadable captions", () => {
  assert.throws(() => assertPublishable(makeTimeline(example)), /Silent/);
  const timeline = makeTimeline(example, example.beats.map((beat) => beat.seconds));
  assert.throws(() => assertPublishable(timeline), /Review required/);
  timeline.reel = { ...structuredClone(example), review: { technical: true, pronunciation: true, visuals: true } };
  assert.throws(() => assertPublishable(timeline), /captions are missing/);
  timeline.beats.forEach((beat) => { beat.captions = [{ startFrame: 0, endFrame: 60, text: "Padhne layak caption." }]; });
  assert.doesNotThrow(() => assertPublishable(timeline));
  timeline.beats[0].captions = [{ startFrame: 0, endFrame: 5, text: "Bahut saare shabd ek saath." }];
  assert.throws(() => assertPublishable(timeline), /too fast/);
});

test("voice cache invalidates when narration or speed changes, not when visuals change", () => {
  const original = voiceKey(example, example.beats[0].speech);
  assert.notEqual(original, voiceKey(example, example.beats[0].speech + "!"));
  const changed = structuredClone(example);
  changed.voice.speed = 1.25;
  assert.notEqual(original, voiceKey(changed, changed.beats[0].speech));
  changed.voice = example.voice;
  changed.beats[0].title = "New headline";
  assert.equal(original, voiceKey(changed, changed.beats[0].speech));
  changed.voice = { ...example.voice, speed: 1.001 };
  assert.equal(reelSchema.safeParse(changed).success, false);
});

test("delivery validation checks actual media shape and audio", () => {
  const timeline = makeTimeline(example, example.beats.map((beat) => beat.seconds));
  const seconds = String(timeline.totalFrames / 30);
  const media: MediaProbe = {
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1080, height: 1920, pix_fmt: "yuv420p", avg_frame_rate: "30/1" },
      { codec_type: "audio", codec_name: "aac", sample_rate: "48000", duration: seconds },
    ], format: { duration: seconds },
  };
  assert.doesNotThrow(() => assertExport(media, timeline, false));
  assert.throws(() => assertExport(media, timeline, true));
  const noAudio = structuredClone(media);
  noAudio.streams.pop();
  assert.throws(() => assertExport(noAudio, timeline, false), /AAC/);
  media.format.duration = "NaN";
  assert.throws(() => assertExport(media, timeline, false), /duration/);
});
