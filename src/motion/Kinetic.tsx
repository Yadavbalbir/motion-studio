import type { CSSProperties, ReactNode } from "react";
import { clamp, inOut } from "./core";

export const back = (n: number) => { const t = clamp(n), c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

/** Overshoot + blur-in entrance and blur-out exit for a kinetic block visible between `at` and `until`. */
export function enter(t: number, at: number, until: number, rise = 46): CSSProperties {
  const p = back((t - at) / .5), leave = inOut((t - until + .28) / .28);
  return {
    opacity: clamp((t - at) / .18) * (1 - leave),
    transform: `translateY(${(1 - p) * rise - leave * 26}px) scale(${.9 + .1 * p})`,
    filter: `blur(${(1 - clamp((t - at) / .32)) * 14 + leave * 10}px)`,
  };
}

export function Letters({ text, t, at, gap = .045 }: { text: string; t: number; at: number; gap?: number }) {
  return <span className="motion-word">{[...text].map((letter, index) => {
    const p = back((t - at - index * gap) / .55);
    return <span key={index} className="motion-letter" style={{
      opacity: clamp((t - at - index * gap) / .14),
      transform: `translateY(${(1 - p) * 120}px) rotate(${(1 - p) * (index % 2 ? 9 : -9)}deg)`,
    }}>{letter}</span>;
  })}</span>;
}

/** A kinetic-typography shot; overflow is only checked once its entrance has settled. */
export function Shot({ t, at, until, className = "", children }: { t: number; at: number; until: number; className?: string; children: ReactNode }) {
  if (t < at - .05 || t > until + .05) return null;
  const settled = t > at + .9 && t < until - .3;
  return <div className={`motion-kinetic ${className}`} data-settled={settled || undefined} style={enter(t, at, until)}>{children}</div>;
}

/** Fades/pops a child in at `at` (for staggered pills and chips inside a shot). */
export function pop(t: number, at: number): CSSProperties {
  return { opacity: clamp((t - at) / .15), transform: `scale(${.7 + .3 * back((t - at) / .4)})` };
}
