import type { Timeline } from "./model";
import type { SfxCue } from "./motion/sfx";

export interface SqlCues {
  hook: number; migrate: number;
  app: number; kinds: number; orders: number; menu: number; rider: number;
  sql: number; schema: number; money: number; both: number; rollback: number; acid: number;
  menuBeat: number; pizza: number; biryani: number; shape: number; mongo: number;
  riderBeat: number; kv: number; redis: number; ram: number;
  nuance: number; overlap: number; mongoTx: number;
  questions: number; qShape: number; qQuery: number; qConsistency: number;
  pickSql: number; pickNoSql: number; safe: number;
  cta: number; follow: number; end: number;
}

/** Absolute start (s) of the aligned caption containing `words`; falls back to its position in a silent storyboard. */
function cueAt(timeline: Timeline, id: string, words: string): number {
  const index = timeline.beats.findIndex((beat) => beat.id === id);
  const timed = timeline.beats[index];
  if (!timed) throw new Error(`SQL motion reel needs beat ${id}.`);
  if (timed.captions) {
    const cue = timed.captions.find((entry) => entry.text.includes(words));
    if (!cue) throw new Error(`Missing motion cue "${words}" in ${id}.`);
    return (timed.startFrame + cue.startFrame) / timeline.fps;
  }
  const caption = timeline.reel.beats[index].caption;
  const at = caption.indexOf(words);
  if (at < 0) throw new Error(`Missing motion cue "${words}" in ${id}.`);
  return (timed.startFrame + at / caption.length * timed.durationFrames * .9) / timeline.fps;
}

/** Shot times derive from the aligned captions so the scene, kinetic type and SFX share one clock. */
export function sqlCues(timeline: Timeline): SqlCues {
  const kinds = cueAt(timeline, "one-app", "Isme teen");
  const both = cueAt(timeline, "orders-sql", "Dono saath");
  const menuBeat = cueAt(timeline, "menu-document", "Menu alag");
  const riderBeat = cueAt(timeline, "rider-key-value", "Rider ki");
  const redis = cueAt(timeline, "rider-key-value", "Redis jaisa");
  const overlap = cueAt(timeline, "blurred-line", "Aaj PostgreSQL");
  const questions = cueAt(timeline, "three-questions", "teen sawaal");
  return {
    hook: cueAt(timeline, "wrong-pick", "SQL ya"),
    migrate: cueAt(timeline, "wrong-pick", "Galat database"),
    app: cueAt(timeline, "one-app", "food delivery"),
    kinds, orders: kinds + 1.5, menu: kinds + 1.95, rider: kinds + 2.45,
    sql: cueAt(timeline, "orders-sql", "Order aur payment"),
    schema: cueAt(timeline, "orders-sql", "Data tables"),
    money: cueAt(timeline, "orders-sql", "Paisa kata"),
    both, rollback: both + .75,
    acid: cueAt(timeline, "orders-sql", "ACID"),
    menuBeat, pizza: menuBeat + .7, biryani: menuBeat + 1.45,
    shape: cueAt(timeline, "menu-document", "Har item"),
    mongo: cueAt(timeline, "menu-document", "MongoDB"),
    riderBeat, kv: cueAt(timeline, "rider-key-value", "simple key"),
    redis, ram: redis + .85,
    nuance: cueAt(timeline, "blurred-line", "Lekin line"),
    overlap, mongoTx: overlap + 2.6,
    questions, qShape: questions + 1.35, qQuery: questions + 2.45, qConsistency: questions + 3.35,
    pickSql: cueAt(timeline, "three-questions", "Relationships"),
    pickNoSql: cueAt(timeline, "three-questions", "Badalta shape"),
    safe: cueAt(timeline, "three-questions", "Doubt ho"),
    cta: cueAt(timeline, "your-app", "Aapki app"),
    follow: cueAt(timeline, "your-app", "Comment karo"),
    end: timeline.totalFrames / timeline.fps,
  };
}

export function sqlSfx(c: SqlCues): SfxCue[] {
  return [
    { at: .02, kind: "whoosh" },
    { at: c.hook + .3, kind: "pop" },
    { at: c.migrate, kind: "whoosh" },
    { at: c.migrate + .5, kind: "buzz" },
    { at: c.app, kind: "whoosh" },
    { at: c.orders, kind: "pop" },
    { at: c.menu, kind: "pop" },
    { at: c.rider, kind: "pop" },
    { at: c.sql, kind: "whoosh" },
    { at: c.sql + .8, kind: "thud" },
    { at: c.schema + .2, kind: "key" },
    { at: c.schema + .45, kind: "key" },
    { at: c.money + .2, kind: "tap" },
    { at: c.money + .9, kind: "tap" },
    { at: c.both + .1, kind: "chime" },
    { at: c.rollback, kind: "buzz" },
    { at: c.acid, kind: "thud" },
    { at: c.acid + .25, kind: "chime" },
    { at: c.menuBeat, kind: "whoosh" },
    { at: c.pizza, kind: "pop" },
    { at: c.biryani, kind: "pop" },
    { at: c.shape + .2, kind: "pop" },
    { at: c.mongo + .2, kind: "shimmer" },
    { at: c.riderBeat, kind: "whoosh" },
    { at: c.riderBeat + .7, kind: "thud" },
    { at: c.kv + .25, kind: "key" },
    { at: c.kv + .6, kind: "key" },
    { at: c.ram, kind: "riser" },
    { at: c.ram + .6, kind: "chime" },
    { at: c.nuance, kind: "whoosh" },
    { at: c.overlap + .4, kind: "pop" },
    { at: c.mongoTx, kind: "pop" },
    { at: c.questions - .5, kind: "riser" },
    { at: c.questions + .2, kind: "shimmer" },
    { at: c.qShape, kind: "thud" },
    { at: c.qQuery, kind: "thud" },
    { at: c.qConsistency, kind: "thud" },
    { at: c.pickSql, kind: "whoosh" },
    { at: c.pickSql + .4, kind: "chime" },
    { at: c.pickNoSql, kind: "whoosh" },
    { at: c.pickNoSql + .4, kind: "chime" },
    { at: c.safe, kind: "whoosh" },
    { at: c.safe + .5, kind: "pop" },
    { at: c.cta, kind: "whoosh" },
    { at: c.follow + .3, kind: "pop" },
  ];
}
