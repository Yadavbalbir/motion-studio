import { useLayoutEffect, useMemo, useRef } from "react";
import { Letters, Shot, enter, pop } from "./motion/Kinetic";
import { HEIGHT, WIDTH, type MotionScene } from "./motion/core";
import { beatAt, type Timeline } from "./model";
import { createSqlScene } from "./SqlMotionScene";
import { sqlCues } from "./sqlMotionModel";
import "./motion/motion.css";
import "./sqlMotion.css";

export function SqlMotionFrame({ timeline, frame, guides = false }: { timeline: Timeline; frame: number; guides?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<MotionScene | null>(null);
  const c = useMemo(() => sqlCues(timeline), [timeline]);
  const t = frame / timeline.fps;
  useLayoutEffect(() => {
    if (!canvas.current) throw new Error("Motion canvas is missing.");
    scene.current = createSqlScene(canvas.current, c);
    return () => { scene.current?.dispose(); scene.current = null; };
  }, [c]);
  useLayoutEffect(() => { scene.current!.draw(t); }, [t]);

  const index = beatAt(timeline, frame);
  const timed = timeline.beats[index];
  const local = frame - timed.startFrame;
  const caption = timed.captions?.find((cue) => local >= cue.startFrame && local < cue.endFrame)?.text ??
    (timed.captions ? "" : timeline.reel.beats[index].caption);
  const dark = t > c.questions - .1 && t < c.cta;
  const grain = Math.floor(frame * 7.31) % 97;
  const rolled = t > c.rollback && t < c.acid;

  return <article id="reel-frame" className={`reel motion-reel sql-motion ${dark ? "motion-dark" : ""}`}>
    <canvas ref={canvas} className="motion-canvas" width={WIDTH} height={HEIGHT} role="img"
      aria-label="Original 3D motion graphic of illustrative SQL tables, JSON menu documents, a rider key-value map and a demo food app." />
    <div className="motion-vignette" />

    <Shot t={t} at={.1} until={c.migrate - .05} className="sql-versus">
      <span className="sql-tag sql-teal" style={pop(t, .15)}>SQL</span>
      <em style={pop(t, .45)}>ya</em>
      <span className="sql-tag sql-orange" style={pop(t, .7)}>NoSQL?</span>
    </Shot>
    <Shot t={t} at={c.migrate + .05} until={c.app - .05} className="sql-wrong">
      <Letters text="Galat pick?" t={t} at={c.migrate + .05} gap={.035} />
      <span className="motion-pill sql-warn" style={pop(t, c.migrate + 1.2)}>⚠ baad mein migrate = dard</span>
    </Shot>

    <Shot t={t} at={c.app + .1} until={c.kinds - .05} className="sql-app">
      <small>EK EXAMPLE</small><strong>Ek food app.</strong>
    </Shot>
    <Shot t={t} at={c.kinds + .05} until={c.sql - .05} className="sql-kinds">
      <small>TEEN TARAH KA DATA</small>
      <div className="sql-chips">
        <span style={pop(t, c.orders)}>🧾 ORDERS</span>
        <span style={pop(t, c.menu)}>🍕 MENU</span>
        <span style={pop(t, c.rider)}>📍 RIDER</span>
      </div>
    </Shot>

    <Shot t={t} at={c.sql + .1} until={c.schema - .05} className="sql-map">
      <span>ORDERS</span><i>→</i><b className="sql-tag sql-teal">SQL</b>
    </Shot>
    <Shot t={t} at={c.schema + .05} until={c.money - .05} className="sql-schema">
      <small>ROWS · COLUMNS · RELATIONS</small><strong>FIXED SCHEMA</strong>
    </Shot>
    <Shot t={t} at={c.money + .05} until={c.both - .05} className="sql-money">
      <strong><span style={pop(t, c.money + .15)}>₹ kata</span> <i style={pop(t, c.money + .55)}>⇒</i> <span style={pop(t, c.money + .85)}>order bana</span></strong>
    </Shot>
    <Shot t={t} at={c.both + .05} until={c.acid - .05} className={`sql-both ${rolled ? "sql-rolled" : ""}`}>
      <strong>DONO <em>ya</em> KOI NAHI</strong>
      <span className="motion-pill" style={pop(t, c.rollback)}>{rolled ? "✕ ROLLBACK" : "✓ COMMIT"}</span>
    </Shot>
    <Shot t={t} at={c.acid + .02} until={c.menuBeat - .05} className="sql-acid">
      <Letters text="ACID" t={t} at={c.acid + .02} gap={.06} />
      <p>{["Atomic", "Consistent", "Isolated", "Durable"].map((word, i) => <span key={word} style={pop(t, c.acid + .45 + i * .14)}>{word}</span>)}</p>
    </Shot>

    <Shot t={t} at={c.menuBeat + .1} until={c.shape - .05} className="sql-map">
      <span>MENU</span><i>→</i><b className="sql-tag sql-orange">DOCUMENT</b>
    </Shot>
    <Shot t={t} at={c.shape + .05} until={c.mongo - .05} className="sql-shape">
      <strong>Har item,<br /><em>alag shape.</em></strong>
    </Shot>
    <Shot t={t} at={c.mongo + .05} until={c.riderBeat - .05} className="sql-flex">
      <strong>{"{ flexible }"}</strong>
      <span className="motion-pill sql-orange-pill" style={pop(t, c.mongo + .7)}>e.g. MongoDB</span>
    </Shot>

    <Shot t={t} at={c.riderBeat + .1} until={c.kv - .05} className="sql-map">
      <span>RIDER</span><i>→</i><b className="sql-tag sql-orange">KEY-VALUE</b>
    </Shot>
    <Shot t={t} at={c.kv + .05} until={c.redis - .05} className="sql-kv">
      <strong><span>rider:42</span> <i>→</i> <em>location</em></strong>
      <p style={pop(t, c.kv + .9)}>baar-baar update · turant read</p>
    </Shot>
    <Shot t={t} at={c.redis + .05} until={c.nuance - .05} className="sql-memory">
      <small>RAM MEIN DATA</small><strong>IN-MEMORY</strong>
      <span className="motion-pill sql-orange-pill" style={pop(t, c.ram)}>e.g. Redis</span>
    </Shot>

    <Shot t={t} at={c.nuance + .05} until={c.overlap - .05} className="sql-nuance">
      <strong>Line <s>seedhi</s> nahi.</strong>
    </Shot>
    <Shot t={t} at={c.overlap + .05} until={c.questions - .15} className="sql-overlap">
      <span className="motion-pill" style={pop(t, c.overlap + .3)}>PostgreSQL + JSONB</span>
      <span className="motion-pill sql-orange-pill" style={pop(t, c.mongoTx)}>MongoDB + transactions</span>
    </Shot>

    <Shot t={t} at={c.questions + .05} until={c.pickSql - .05} className="sql-questions">
      <small>DECIDE KARNE SE PEHLE</small><strong>3 SAWAAL</strong>
    </Shot>
    <Shot t={t} at={c.pickSql + .05} until={c.pickNoSql - .05} className="sql-pick">
      <p>Relationships + ₹ safety</p><b className="sql-tag sql-teal">SQL</b>
    </Shot>
    <Shot t={t} at={c.pickNoSql + .05} until={c.safe - .05} className="sql-pick">
      <p>Badalta shape · simple lookups</p><b className="sql-tag sql-orange">NoSQL</b>
    </Shot>
    <Shot t={t} at={c.safe + .05} until={c.cta - .05} className="sql-pick">
      <p>Doubt hai?</p><b className="sql-tag sql-teal">SQL = safe start</b>
    </Shot>

    {t >= c.cta - .05 && <div className="motion-endcard sql-endcard" data-settled={t > c.cta + .9 || undefined} style={enter(t, c.cta, c.end + 1)}>
      <small>AAPKI APP</small>
      <strong>Kaunsa <em>DB?</em></strong>
      <div className="sql-cta">
        <span className="motion-pill" style={pop(t, c.follow + .2)}>💬 Comment karo</span>
        <span className="motion-pill sql-orange-pill" style={pop(t, c.follow + .6)}>Follow karo →</span>
      </div>
    </div>}

    <div className={`motion-caption ${caption ? "" : "motion-caption-gap"}`}><p>{caption}</p></div>
    <div className="motion-progress"><i style={{ width: `${(frame + 1) / timeline.totalFrames * 100}%` }} /></div>
    <div className="motion-grain" style={{ backgroundPosition: `${grain * 3}px ${grain * 5}px` }} />
    {timeline.silent && <div className="preview-watermark">STORYBOARD / NO VOICE</div>}
    {guides && <div className="safe-guide"><span>CONSERVATIVE UI-SAFE AREA</span></div>}
  </article>;
}
