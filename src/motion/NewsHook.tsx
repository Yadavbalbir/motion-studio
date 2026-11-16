import { back, pop } from "./Kinetic";
import { clamp, inOut } from "./core";

/** Real-world proof shown in the round inset: a photo the creator has rights to, or a sourced number. */
export type HookProof =
  | { src: string; alt: string; credit?: string }
  | { stat: string; label: string; credit?: string };

export interface NewsHookProps {
  t: number;
  /** Seconds; use a negative value (e.g. -0.4) so the card is fully on screen at frame 0. */
  at: number;
  until: number;
  /** 2–4 words, the topic people already talk about ("Tatkal Crash"). */
  title: string;
  emoji?: string;
  /** Optional small teaser line above the bar, usually the first spoken words. */
  kicker?: string;
  proof?: HookProof;
  /** Vertical centre of the title bar in px; keep clear of the kinetic type zone and the captions. */
  y?: number;
}

/**
 * Frame-0 news hook: a red title bar with an emoji and a round proof inset, laid over the
 * scene's most dramatic moment. It is on screen from the first frame, never faded up.
 */
export function NewsHook({ t, at, until, title, emoji, kicker, proof, y = 640 }: NewsHookProps) {
  if (t < at - .05 || t > until + .05) return null;
  const leave = inOut((t - (until - .3)) / .3);
  const grow = back((t - at) / .4);
  return <div className="motion-newshook" data-settled={t > at + .6 && t < until - .3 || undefined}
    style={{ top: `${y}px`, opacity: 1 - leave, transform: `translateY(${leave * -30}px)` }}>
    {kicker && <p className="motion-newshook-kicker" style={pop(t, at + .1)}>{kicker}</p>}
    <div className="motion-newshook-row">
      <span className="motion-newshook-bar" style={{ transform: `scaleX(${clamp(grow)})` }}>{title}</span>
      {emoji && <span className="motion-newshook-emoji" style={pop(t, at + .3)}>{emoji}</span>}
    </div>
    {proof && <figure className="motion-newshook-proof" style={pop(t, at + .2)}>
      {"src" in proof ? <img src={proof.src} alt={proof.alt} /> : <div><b>{proof.stat}</b><span>{proof.label}</span></div>}
      {proof.credit && <figcaption>{proof.credit}</figcaption>}
    </figure>}
  </div>;
}
