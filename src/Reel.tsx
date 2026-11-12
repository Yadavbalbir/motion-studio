import type { ComponentType } from "react";
import type { Beat, Timeline } from "./model";
import { TapMotionFrame } from "./TapMotionFrame";
import { SqlMotionFrame } from "./SqlMotionFrame";

export interface FrameProps { timeline: Timeline; frame: number; guides?: boolean }

// One full-frame motion composition per visual family; register new families here, in model.ts and in motion/sfx.ts.
const frames: Record<Beat["visual"], ComponentType<FrameProps>> = {
  "tap-motion": TapMotionFrame,
  "sql-motion": SqlMotionFrame,
};

export function ReelFrame(props: FrameProps) {
  const Frame = frames[props.timeline.reel.beats[0].visual];
  return <Frame {...props} />;
}
