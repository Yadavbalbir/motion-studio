import assert from "node:assert/strict";
import test from "node:test";
import { readReel } from "../scripts/lib";
import { makeTimeline } from "../src/model";
import { motionSfxFor } from "../src/motion/sfx";
import { sqlCues } from "../src/sqlMotionModel";

const ordered = (cues: ReturnType<typeof sqlCues>) => [
  cues.hook, cues.migrate, cues.app, cues.kinds, cues.orders, cues.menu, cues.rider, cues.sql, cues.schema, cues.money,
  cues.both, cues.rollback, cues.acid, cues.menuBeat, cues.pizza, cues.biryani, cues.shape, cues.mongo, cues.riderBeat,
  cues.kv, cues.redis, cues.ram, cues.nuance, cues.overlap, cues.mongoTx, cues.questions, cues.qShape, cues.qQuery,
  cues.qConsistency, cues.pickSql, cues.pickNoSql, cues.safe, cues.cta, cues.follow, cues.end,
];

test("SQL vs NoSQL motion reel stays within a minute and orders its cues and SFX", async () => {
  const reel = await readReel("sql-vs-nosql");
  assert.equal(reel.voice.speed, 1.5);
  assert.deepEqual(reel.review, { technical: false, pronunciation: false, visuals: false });
  const silent = makeTimeline(reel);
  const measured = makeTimeline(reel, reel.beats.map((beat) => beat.seconds * 0.9));
  assert.ok(measured.totalFrames <= 60 * measured.fps);
  for (const timeline of [silent, measured]) {
    const order = ordered(sqlCues(timeline));
    order.slice(1).forEach((value, i) => assert.ok(value > order[i], `cue ${i + 1} must follow cue ${i}`));
    const sfx = motionSfxFor(timeline);
    assert.ok(sfx.length > 20 && sfx.every((cue) => cue.at >= 0 && cue.at < order.at(-1)!));
  }
});
