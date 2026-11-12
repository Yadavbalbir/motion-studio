import type { Timeline } from "./model";
import type { SfxCue } from "./motion/sfx";

export interface MotionCues {
  card: number;
  tap: number;
  hit: number;
  coffee: number;
  cut: number;
  cashier: number;
  approach: number;
  inside: number;
  endCard: number;
  end: number;
}

function cueAt(timeline: Timeline, beat: number, words: string): number {
  const timed = timeline.beats[beat];
  if (!timed) throw new Error(`Motion pilot needs beat ${beat + 1}.`);
  const cue = timed.captions?.find((entry) => entry.text.includes(words));
  if (timed.captions && !cue) throw new Error(`Missing motion cue "${words}" in ${timed.id}.`);
  const fallback = { "battery": 0.1, "Phir machine": 1.06, "Chalo": 3.12, "Cashier": 0.16, "Aapne amount": 1.88, "Ab andar": 5.16 }[words] ?? 0;
  return (timed.startFrame + (cue ? cue.startFrame : Math.round(fallback * timeline.fps))) / timeline.fps;
}

/** Shot times come from the aligned captions so visuals and SFX stay locked to the narration. */
export function motionCues(timeline: Timeline): MotionCues {
  const tap = cueAt(timeline, 0, "Phir machine");
  const coffee = cueAt(timeline, 0, "Chalo");
  const inside = cueAt(timeline, 1, "Ab andar");
  return {
    card: cueAt(timeline, 0, "battery"),
    tap,
    hit: tap + 0.62,
    coffee,
    cut: coffee + 0.42,
    cashier: cueAt(timeline, 1, "Cashier"),
    approach: cueAt(timeline, 1, "Aapne amount"),
    inside,
    endCard: inside + 1.55,
    end: timeline.totalFrames / timeline.fps,
  };
}

export function motionSfx(cues: MotionCues): SfxCue[] {
  return [
    { at: 0.02, kind: "whoosh" },
    { at: cues.card + 0.55, kind: "pop" },
    { at: cues.tap, kind: "whoosh" },
    { at: cues.hit, kind: "tap" },
    { at: cues.hit + 0.34, kind: "chime" },
    { at: cues.tap + 1.18, kind: "pop" },
    { at: cues.coffee, kind: "whoosh" },
    { at: cues.coffee + 0.62, kind: "pop" },
    { at: cues.cashier + 0.3, kind: "key" },
    { at: cues.cashier + 0.6, kind: "key" },
    { at: cues.cashier + 0.9, kind: "key" },
    { at: cues.approach + 0.62, kind: "pop" },
    { at: cues.approach + 1.5, kind: "whoosh" },
    { at: cues.inside - 0.45, kind: "riser" },
    { at: cues.inside + 0.42, kind: "shimmer" },
    { at: cues.endCard, kind: "pop" },
  ];
}
