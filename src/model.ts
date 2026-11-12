import { z } from "zod";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64);
const shortText = (max: number) => z.string().trim().min(1).max(max);
const durationBounds = { short: [15, 90], explainer: [90, 120] } as const;

export const beatSchema = z.object({
  id: slugSchema,
  chapter: shortText(24),
  title: shortText(52),
  caption: shortText(400),
  captionSegments: z.array(z.object({ speech: shortText(150), caption: shortText(100) })).min(1).max(12),
  speech: shortText(300),
  seconds: z.number().min(2).max(12),
  pauseAfter: z.number().min(0).max(3.5).default(0),
  // Motion family that renders the whole reel; register new families in Reel.tsx and motion/sfx.ts.
  visual: z.enum(["tap-motion", "sql-motion"]),
}).superRefine((beat, ctx) => {
  for (const field of ["speech", "caption"] as const) {
    if (beat.captionSegments.map((part) => part[field]).join(" ") !== beat[field]) {
      ctx.addIssue({ code: "custom", path: ["captionSegments"], message: `Caption segments must cover the complete ${field} verbatim.` });
    }
  }
});

export const reelSchema = z.object({
  slug: slugSchema,
  title: shortText(80),
  topic: shortText(100),
  audience: shortText(120),
  takeaway: shortText(180),
  format: z.enum(["short", "explainer"]).default("short"),
  soundtrack: z.enum(["none", "ambient"]).default("ambient"),
  voice: z.object({
    model: z.literal("bulbul:v4-flash"),
    speaker: z.literal("shubh_enhi_companion"),
    speed: z.number().min(0.75).max(1.5).multipleOf(0.01),
  }),
  sources: z.array(z.object({
    title: shortText(160),
    url: z.string().url().refine((value) => value.startsWith("https://"), "Use HTTPS sources."),
    supports: shortText(300),
  })).min(1),
  publishing: z.object({
    youtubeTitle: shortText(100),
    instagramCaption: shortText(2200),
    hashtags: z.array(z.string().regex(/^#[A-Za-z0-9_]+$/)).min(1).max(8),
  }),
  review: z.object({
    technical: z.boolean(),
    pronunciation: z.boolean(),
    visuals: z.boolean(),
  }),
  beats: z.array(beatSchema).min(2).max(18),
}).superRefine((reel, ctx) => {
  if (new Set(reel.beats.map((beat) => beat.visual)).size !== 1) {
    ctx.addIssue({ code: "custom", path: ["beats"], message: "All beats must use the same motion family." });
  }
  if (new Set(reel.beats.map((beat) => beat.id)).size !== reel.beats.length) {
    ctx.addIssue({ code: "custom", path: ["beats"], message: "Beat IDs must be unique." });
  }
  const duration = reel.beats.reduce((total, beat) => total + beat.seconds, 0);
  const [minimum, maximum] = durationBounds[reel.format];
  if (duration < minimum || duration > maximum) {
    ctx.addIssue({ code: "custom", path: ["beats"], message: `Storyboard must be ${minimum}-${maximum} seconds.` });
  }
});

export type Reel = z.infer<typeof reelSchema>;
export type Beat = Reel["beats"][number];
export const VOICE_ENGINE = "sarvam-shubh-v1";
export interface TimedBeat {
  id: string;
  startFrame: number;
  durationFrames: number;
  audio?: string;
  captions?: { startFrame: number; endFrame: number; text: string }[];
}
export interface Timeline {
  reel: Reel;
  fps: number;
  totalFrames: number;
  silent: boolean;
  beats: TimedBeat[];
}

export function groupCaptionCues(cues: NonNullable<TimedBeat["captions"]>): NonNullable<TimedBeat["captions"]> {
  const grouped: NonNullable<TimedBeat["captions"]> = [];
  for (const cue of cues) {
    const previous = grouped.at(-1);
    if (previous && (cue.endFrame - cue.startFrame < 21 || previous.endFrame - previous.startFrame < 21 ||
        cue.text.split(/\s+/).length / ((cue.endFrame - cue.startFrame) / FPS) > 5.5) &&
        `${previous.text} ${cue.text}`.split(/\s+/).length <= 12) {
      previous.endFrame = cue.endFrame;
      previous.text += ` ${cue.text}`;
    } else grouped.push({ ...cue });
  }
  return grouped;
}

export function holdCaptions(cues: NonNullable<TimedBeat["captions"]>, durationFrames: number): NonNullable<TimedBeat["captions"]> {
  return cues.map((cue, index) => {
    const limit = cues[index + 1]?.startFrame ?? durationFrames;
    const requiredEnd = cue.startFrame + Math.ceil(cue.text.split(/\s+/).length * FPS / 5.5);
    if (requiredEnd > limit) {
      throw new Error(`Not enough reading time for "${cue.text}". Regroup captions or revise the delivery.`);
    }
    return { ...cue, endFrame: Math.max(cue.endFrame, requiredEnd) };
  });
}

export function makeTimeline(reel: Reel, durations?: number[]): Timeline {
  if (durations && (durations.length !== reel.beats.length ||
    durations.some((duration) => !Number.isFinite(duration) || duration <= 0 || duration > 20))) {
    throw new Error("Provide one finite audio duration (0-20 seconds) per beat.");
  }
  let cursor = 0;
  const beats = reel.beats.map((beat, index) => {
    const durationFrames = durations
      ? Math.ceil(durations[index] * FPS) + Math.round(beat.pauseAfter * FPS)
      : Math.ceil(beat.seconds * FPS);
    const timed: TimedBeat = {
      id: beat.id,
      startFrame: cursor,
      durationFrames,
      ...(durations ? { audio: `/generated/${reel.slug}/audio/${beat.id}.wav` } : {}),
    };
    cursor += durationFrames;
    return timed;
  });
  const [minimum, maximum] = durationBounds[reel.format];
  if (cursor < minimum * FPS || cursor > maximum * FPS) {
    throw new Error(`Measured ${reel.format} duration must be ${minimum}-${maximum} seconds; got ${(cursor / FPS).toFixed(2)}. Revise the script or delivery.`);
  }
  return { reel, fps: FPS, totalFrames: cursor, silent: !durations, beats };
}

export function beatAt(timeline: Timeline, frame: number): number {
  if (!Number.isFinite(frame)) throw new Error("Frame must be finite.");
  const bounded = Math.max(0, Math.min(timeline.totalFrames - 1, Math.floor(frame)));
  return timeline.beats.findIndex((beat) =>
    bounded >= beat.startFrame && bounded < beat.startFrame + beat.durationFrames);
}

export function assertPublishable(timeline: Timeline): void {
  if (timeline.silent) throw new Error("Silent storyboards cannot be published.");
  const outstanding = Object.entries(timeline.reel.review)
    .filter(([, approved]) => !approved).map(([name]) => name);
  if (outstanding.length) throw new Error(`Review required before final export: ${outstanding.join(", ")}.`);
  for (const timed of timeline.beats) {
    if (!timed.captions) throw new Error(`Aligned captions are missing for ${timed.id}.`);
    for (const cue of timed.captions) {
      if (cue.text.split(/\s+/).length / ((cue.endFrame - cue.startFrame) / FPS) > 5.5) {
        throw new Error(`Aligned caption too fast to read: ${timed.id}. Slow the narration.`);
      }
    }
  }
}

function timestamp(frame: number): string {
  const ms = Math.round(frame * 1000 / FPS);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:` +
    `${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:` +
    `${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}

export function subtitles(timeline: Timeline): string {
  return timeline.beats.flatMap((timed, index) => (timed.captions ?? [{
    startFrame: 0, endFrame: timed.durationFrames, text: timeline.reel.beats[index].caption,
  }]).map((cue) => ({ ...cue, startFrame: timed.startFrame + cue.startFrame, endFrame: timed.startFrame + cue.endFrame })))
    .map((cue, index) => `${index + 1}\n${timestamp(cue.startFrame)} --> ${timestamp(cue.endFrame)}\n${cue.text}\n`).join("\n");
}
