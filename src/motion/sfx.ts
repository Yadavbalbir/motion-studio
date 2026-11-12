import type { Timeline } from "../model";
import { motionCues, motionSfx } from "../tapMotionModel";
import { sqlCues, sqlSfx } from "../sqlMotionModel";

export type SfxKind = "whoosh" | "tap" | "chime" | "pop" | "key" | "riser" | "shimmer" | "thud" | "buzz";
export interface SfxCue { at: number; kind: SfxKind }

/** Shot-locked effects for motion reels; an empty list keeps the default beat-transition sweeps. */
export function motionSfxFor(timeline: Timeline): SfxCue[] {
  const visual = timeline.reel.beats[0].visual;
  if (visual === "tap-motion") return motionSfx(motionCues(timeline));
  if (visual === "sql-motion") return sqlSfx(sqlCues(timeline));
  return [];
}
