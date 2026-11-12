import assert from "node:assert/strict";
import test from "node:test";
import { readReel } from "../scripts/lib";
import { makeTimeline } from "../src/model";
import { motionCues, motionSfx } from "../src/tapMotionModel";

test("Tap motion pilot stays 15 s and orders shot cues", async () => {
  const reel = await readReel("tap-pay-motion-pilot");
  assert.deepEqual(reel.review, { technical: false, pronunciation: false, visuals: false });
  const timeline = makeTimeline(reel);
  assert.ok(timeline.totalFrames >= 15 * 30 && timeline.totalFrames <= 16 * 30);
  const cues = motionCues(timeline);
  const order = [cues.card, cues.tap, cues.hit, cues.coffee, cues.cut, cues.cashier, cues.approach, cues.inside, cues.endCard, cues.end];
  order.slice(1).forEach((value, i) => assert.ok(value > order[i]));
  assert.ok(cues.end - cues.endCard >= 1.5);
  assert.ok(motionSfx(cues).every((sfx) => sfx.at >= 0 && sfx.at < cues.end));
});
