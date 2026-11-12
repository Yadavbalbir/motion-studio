import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import { ReelFrame } from "./Reel";
import { beatAt, makeTimeline, reelSchema, slugSchema, type Timeline } from "./model";
import "./style.css";

declare global {
  interface Window {
    reelStudio?: {
      setFrame: (frame: number) => void;
      totalFrames: number;
      overflow: () => string[];
    };
  }
}

const query = new URLSearchParams(location.search);
const renderMode = query.get("render") === "1";
const slug = query.get("reel") ?? "sql-vs-nosql";
if (renderMode) document.body.classList.add("render-mode");

async function load(): Promise<Timeline> {
  slugSchema.parse(slug);
  const response = await fetch(`/reels/${slug}.json`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Reel "${slug}" not found (${response.status}).`);
  const reel = reelSchema.parse(await response.json());
  const prepared = await fetch(`/generated/${slug}/timeline.json`, { headers: { Accept: "application/json" } });
  if (prepared.status === 404 && !renderMode) return makeTimeline(reel);
  if (!prepared.ok) throw new Error("Prepare this reel first: npm run reel -- prepare " + slug);
  const timeline: Timeline = await prepared.json();
  timeline.reel = reelSchema.parse(timeline.reel);
  if (JSON.stringify(timeline.reel) !== JSON.stringify(reel)) {
    throw new Error("Prepared timeline is stale. Run prepare again after editing the reel.");
  }
  return timeline;
}

function App({ timeline }: { timeline: Timeline }) {
  const [frame, setFrame] = useState(renderMode ? 0 : 30);
  const [playing, setPlaying] = useState(false);
  const [guides, setGuides] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const index = beatAt(timeline, frame);
  const current = timeline.beats[index];
  const currentRef = useRef(frame);
  currentRef.current = frame;
  useEffect(() => {
    window.reelStudio = {
      totalFrames: timeline.totalFrames,
      setFrame(value) {
        flushSync(() => setFrame(Math.max(0, Math.min(timeline.totalFrames - 1, Math.floor(value)))));
      },
      overflow() {
        return [...document.querySelectorAll<HTMLElement>(".motion-kinetic[data-settled], .motion-caption, .motion-endcard[data-settled]")]
          .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
          .map((element) => element.className || element.tagName);
      },
    };
    return () => { delete window.reelStudio; };
  }, [timeline]);
  useEffect(() => {
    if (!playing) return;
    const startFrame = currentRef.current;
    const start = performance.now();
    let request = 0;
    const tick = (now: number) => {
      const next = startFrame + Math.floor((now - start) * timeline.fps / 1000);
      if (next >= timeline.totalFrames) { setPlaying(false); setFrame(0); return; }
      setFrame(next);
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, timeline]);
  useEffect(() => {
    const player = audio.current;
    if (!player || !current.audio || renderMode) return;
    player.currentTime = Math.max(0, (currentRef.current - current.startFrame) / timeline.fps);
    if (playing) {
      player.play().catch((cause: Error) => { setError(`Audio playback failed: ${cause.message}`); setPlaying(false); });
    } else player.pause();
  }, [current, playing, timeline.fps]);
  const seek = (value: number) => { setPlaying(false); setFrame(value); };
  if (renderMode) return <ReelFrame timeline={timeline} frame={frame} />;
  return <main className="studio">
    <aside className="sidebar">
      <a className="studio-logo" href="/">e<span>/</span> studio</a>
      <div className="workspace-label">HINGLISH MOTION REELS</div>
      <h2>Small screen.<br /><span>Big understanding.</span></h2>
      <p className="intro">One topic. Original 3D motion. A takeaway worth keeping.</p>
      <div className="project-card"><span className="eyebrow">CURRENT STORY</span><h3>{timeline.reel.title}</h3>
        <div className="project-meta"><span>9:16</span><span>1080 × 1920</span><span>{(timeline.totalFrames / 30).toFixed(1)}s</span></div>
        <div className={`mode-label ${timeline.silent ? "" : "voiced"}`}>{timeline.silent ? "STORYBOARD — VOICE NOT GENERATED" : "AUDIO-TIMED PREVIEW"}</div>
      </div>
      <div className="section-label"><span>STORY BEATS</span><span>{timeline.beats.length}</span></div>
      <nav className="beat-list" aria-label="Story beats">
        {timeline.reel.beats.map((beat, beatIndex) =>
          <button key={beat.id} className={index === beatIndex ? "selected" : ""} onClick={() => seek(timeline.beats[beatIndex].startFrame)}>
            <span>{String(beatIndex + 1).padStart(2, "0")}</span><div><strong>{beat.title}</strong><small>{beat.chapter}</small></div>
            <span>{(timeline.beats[beatIndex].durationFrames / 30).toFixed(1)}s</span>
          </button>)}
      </nav>
      <p className="sidebar-bottom">SARVAM / TRIAL-CREDIT NARRATION<br />YouTube Shorts + Instagram Reels</p>
    </aside>
    <section className="preview-area">
      <div className="preview-toolbar"><span><i /> COMPOSITION PREVIEW</span>
        <label><input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} /> Safe zones</label>
      </div>
      <div className="phone-shell"><div className="scaled-reel"><ReelFrame timeline={timeline} frame={frame} guides={guides} /></div></div>
      <div className="transport">
        <button onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Play"}>{playing ? "Pause" : "Play"}</button>
        <input aria-label="Timeline" type="range" min="0" max={timeline.totalFrames - 1} value={frame} onChange={(event) => seek(Number(event.target.value))} />
        <span>{(frame / 30).toFixed(1)} / {(timeline.totalFrames / 30).toFixed(1)}s</span>
      </div>
      <p className="preview-hint">{timeline.silent ? "Visual timing is estimated. Final timing comes from the actual voice recording." :
        "Full transcript, locally aligned to the recording. This composition player plays narration; the exported MP4 adds music and SFX."}</p>
      {error && <p role="alert" className="error">{error}</p>}
      <audio ref={audio} src={current.audio} preload="auto" onError={() => { if (current.audio) { setError("Audio failed to load. Regenerate or prepare the reel."); setPlaying(false); } }} />
    </section>
  </main>;
}

const root = createRoot(document.getElementById("root")!);
load().then(async (timeline) => {
  await document.fonts.ready;
  root.render(<App timeline={timeline} />);
}).catch((error: Error) => root.render(<div className="fatal" role="alert"><h1>Cannot open this reel</h1><p>{error.message}</p></div>));
