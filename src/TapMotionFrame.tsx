import { useLayoutEffect, useMemo, useRef } from "react";
import { Letters, Shot, back, enter } from "./motion/Kinetic";
import { beatAt, type Timeline } from "./model";
import { createMotionScene, HEIGHT, WIDTH, out, type MotionScene } from "./TapMotionScene";
import { motionCues } from "./tapMotionModel";
import "./motion/motion.css";
import "./tapMotion.css";

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function TapMotionFrame({ timeline, frame, guides = false }: { timeline: Timeline; frame: number; guides?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<MotionScene | null>(null);
  const cues = useMemo(() => motionCues(timeline), [timeline]);
  const t = frame / timeline.fps;
  useLayoutEffect(() => {
    if (!canvas.current) throw new Error("Motion canvas is missing.");
    scene.current = createMotionScene(canvas.current, cues);
    return () => { scene.current?.dispose(); scene.current = null; };
  }, [cues]);
  useLayoutEffect(() => { scene.current!.draw(t); }, [t]);

  const index = beatAt(timeline, frame);
  const timed = timeline.beats[index];
  const local = frame - timed.startFrame;
  const caption = timed.captions?.find((cue) => local >= cue.startFrame && local < cue.endFrame)?.text ??
    (timed.captions ? "" : timeline.reel.beats[index].caption);
  const dark = t > cues.inside + .2;
  const strike = out((t - cues.card - .5) / .3);
  const drawn = out((t - .1) / .55);
  const amount = t < cues.cashier + .6 ? "₹2" : t < cues.cashier + .9 ? "₹20" : "₹200";
  const grain = Math.floor(frame * 7.31) % 97;

  return <article id="reel-frame" className={`reel motion-reel ${dark ? "motion-dark" : ""}`}>
    <canvas ref={canvas} className="motion-canvas" width={WIDTH} height={HEIGHT} role="img"
      aria-label="Original 3D motion graphic of an illustrative contactless card, payment terminal and coffee cup." />
    <div className="motion-vignette" />

    <Shot t={t} at={.12} until={cues.tap + .3} className="motion-battery">
      <svg viewBox="0 0 300 140" aria-hidden="true">
        <rect x="8" y="14" width="250" height="112" rx="22" fill="none" stroke="#202d32" strokeWidth="11"
          strokeDasharray="760" strokeDashoffset={760 * (1 - drawn)} />
        <rect x="262" y="48" width="26" height="44" rx="8" fill="#202d32" opacity={drawn} />
        <path d="M24 130 250 10" stroke="#cd5137" strokeWidth="15" strokeLinecap="round"
          strokeDasharray="260" strokeDashoffset={260 * (1 - strike)} />
      </svg>
      <div><small>CARD MEIN</small><strong>BATTERY?</strong></div>
      <b className="motion-stamp" style={{ opacity: strike, transform: `rotate(-8deg) scale(${1.6 - .6 * back((t - cues.card - .5) / .4)})` }}>NAHI</b>
    </Shot>

    <Shot t={t} at={cues.hit - .04} until={cues.tap + 1.12} className="motion-tap">
      <strong>TAP!</strong>
      <span className="motion-pill" style={{ opacity: clamp((t - cues.hit - .34) / .15) }}>✓ PAYMENT DONE</span>
    </Shot>

    <Shot t={t} at={cues.tap + 1.14} until={cues.coffee + .12} className="motion-question">
      <Letters text="KAISE?" t={t} at={cues.tap + 1.14} />
    </Shot>

    <Shot t={t} at={cues.coffee + .58} until={cues.cashier + .05} className="motion-coffee">
      <small>CHALO, EK EXAMPLE</small><strong>Ek coffee.</strong>
    </Shot>

    <Shot t={t} at={cues.cashier + .22} until={cues.approach + .3} className="motion-amount">
      <small>CASHIER ENTERS</small><strong key={amount} style={{ transform: `scale(${1 + .12 * (1 - out((t % 0.3) / .2))})` }}>{amount}</strong>
    </Shot>

    <Shot t={t} at={cues.approach + .58} until={cues.inside + .05} className="motion-check">
      <span className="motion-pill">✓ AMOUNT CHECKED</span>
      <p style={{ opacity: clamp((t - cues.approach - 1.5) / .3) }}>Contactless card → machine ke paas</p>
    </Shot>

    <Shot t={t} at={cues.inside + .12} until={cues.endCard - .02} className="motion-inside">
      <Letters text="ANDAR KYA HAI?" t={t} at={cues.inside + .12} gap={.03} />
    </Shot>

    {t >= cues.endCard - .05 && <div className="motion-endcard" data-settled={t > cues.endCard + .9 || undefined} style={enter(t, cues.endCard, cues.end + 1)}>
      <small>PART 2</small>
      <strong>Card ke andar<br /><em>ka secret</em></strong>
      <span className="motion-pill" style={{ opacity: clamp((t - cues.endCard - .45) / .25) }}>Follow karo →</span>
    </div>}

    <div className={`motion-caption ${caption ? "" : "motion-caption-gap"}`}><p>{caption}</p></div>
    <div className="motion-progress"><i style={{ width: `${(frame + 1) / timeline.totalFrames * 100}%` }} /></div>
    <div className="motion-grain" style={{ backgroundPosition: `${grain * 3}px ${grain * 5}px` }} />
    {timeline.silent && <div className="preview-watermark">STORYBOARD / NO VOICE</div>}
    {guides && <div className="safe-guide"><span>CONSERVATIVE UI-SAFE AREA</span></div>}
  </article>;
}
