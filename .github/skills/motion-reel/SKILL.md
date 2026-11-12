---
name: motion-reel
description: Turn a topic (e.g. "Rate Limiting") into a cinematic 3D motion-graphics Hinglish reel (Three.js scene + camera moves + kinetic typography + caption-locked SFX + Sarvam narration) for Instagram Reels and YouTube Shorts. Use whenever the user asks for a reel, gives a topic for one, or wants premium animated explainers.
---

# Cinematic motion-graphics reel

The two bundled examples set the quality bar: `tap-pay-motion-pilot` (15 s)
and `sql-vs-nosql` (≈ 60 s). Every new reel must match or beat them.
Reference implementation:

| Concern | File |
|---|---|
| Reel data (beats, captions, review flags) | `public/reels/tap-pay-motion-pilot.json`, `public/reels/sql-vs-nosql.json` |
| Shared studio, camera `shot()`, `poseTrack`, motion blur, easing | `src/motion/core.ts` |
| Shared kinetic text (`Shot`, `Letters`, `enter`, `pop`) and styles | `src/motion/Kinetic.tsx`, `src/motion/motion.css` |
| Cue times + SFX list from aligned captions | `src/tapMotionModel.ts`, `src/sqlMotionModel.ts` |
| Three.js set, objects, camera moves | `src/TapMotionScene.ts`, `src/SqlMotionScene.ts` |
| Per-reel kinetic shots, captions, end card | `src/TapMotionFrame.tsx`, `src/SqlMotionFrame.tsx` + CSS |
| SFX registry (`SfxKind`, `motionSfxFor`) | `src/motion/sfx.ts` |
| SFX synthesis + music ducking | `scripts/soundtrack.ts` (`sfx()`, `sfxLength`) |
| Schema / frame registry | `src/model.ts` (`visual` enum), `src/Reel.tsx` (`frames` map) |
| Overflow selectors | `src/main.tsx` (`[data-settled]` kinetic text) |

Always obey the project instructions and `README.md` first: Sarvam Shubh
(free/trial credits only, local `atempo`, never double-apply speed), complete
Roman-Hinglish `captionSegments` with local forced alignment, Devanagari
speech, sourced facts, no invented numbers, review flags reset to `false`,
no commit/push/publish without a separate request.

## Topic-only quickstart (defaults when the user gives just a topic)

- **Format:** `short`, ≤ 60 s, Sarvam Shubh `bulbul:v4-flash` at speed 1.5,
  8 beats, ≤ ~1,100 speech characters (≈ 21.5 chars/s at 1.5×), `soundtrack:
  "ambient"`. `public/reels/sql-vs-nosql.json` is the
  template for a 60-s reel; the pilot is the template for 15 s.
- **Story shape (60 s):** hook problem (why it matters) → one concrete
  everyday example kept throughout → 3–4 "physical" demonstrations, one per
  concept → nuance/limitation → decision rule → comment + follow CTA.
- **Stop for approval once:** present the 8-beat script (Devanagari speech
  with English terms + Roman captions) and sources. Only after approval spend
  voice credits. If no Sarvam key is in the environment, ask the user to run
  `npm run voice -- <slug> --trial-credits-confirmed` themselves; if they paste
  a key, use it inline for that one command only, never persist it, and
  remind them to rotate it.
- **Publishing text:** short and focused — title, a 2–3 line description
  (don't recap the video), CTA, max 5 Instagram hashtags; YouTube title with
  `#shorts`.

## Workflow

1. **Story first, shot list second.** Confirm the topic and narration script
   with the user before spending voice credits. Then write a shot plan in the
   session artifacts folder (template: `shot-plan-template.md`). Every shot names:
   the spoken caption that triggers it, the camera move, the object action,
   the kinetic word(s), and the SFX hit.
2. **Narration.** Reuse approved audio when possible (copy WAVs + `.sarvam.json`
   + filtered manifest + filtered `captions-aligned.json`, as the pilot did).
   Otherwise `npm run voice -- <slug> --trial-credits-confirmed`, then
   `npm run captions` / `npm run reel -- prepare <slug>`.
3. **New visual family.** Add `<topic>-motion` to the `visual` enum in
   `src/model.ts` and register its frame in the `frames` map in
   `src/Reel.tsx`. Start the reel with `npm run reel -- new <slug>` and
   replace all copied content. Create `src/<topic>MotionModel.ts`,
   `src/<Topic>MotionScene.ts`, `src/<Topic>MotionFrame.tsx`,
   `src/<topic>Motion.css`. Build on `src/motion/` (`createStudio`,
   `createCamera().shot`, `poseTrack`, `blurredDraw`, `Shot`, `Letters`,
   `pop`, `enter`) and copy `SqlMotionScene.ts`/`SqlMotionFrame.tsx` as the
   structural template. Never branch another reel's files with `if topic`
   logic; promote genuinely reusable props into `src/motion/`.
4. **Cues from captions, never hard-coded seconds.** `motionCues(timeline)`
   finds caption entries by text (`cueAt(timeline, beat, "words")`) and
   derives offsets (`hit = tap + .62`). Throw on a missing cue. Scene,
   typography and SFX all read the same cue object, so a re-recorded voice
   re-times everything automatically.
5. **Build the scene** (see Craft rules), then iterate with stills:
   `npx tsx .github/skills/motion-reel/scripts/stills.ts <slug> <outdir> <frames...>`
   (~1 s per frame, runs in parallel). It prints overflow per frame. Expect
   2–3 still iterations: first pass usually shows stray props, low-contrast
   textures and rows/objects sliding into neighbours. Make a contact sheet and inspect it:
   `ffmpeg -pattern_type glob -i '<outdir>/still-*.jpg' -vf "scale=360:640,tile=6x1" -frames:v 1 sheet.jpg`.
   Check at least one frame per shot, each transition midpoint, and the end card.
6. **SFX.** Return `SfxCue[]` from your model and register the visual in
   `motionSfxFor()` in `src/motion/sfx.ts` (default beat sweeps are disabled
   whenever motion SFX exist).
   Add new `SfxKind`s by synthesis only (no downloaded samples).
7. **Tests + docs.** Add `tests/<topic>-motion.test.ts`: voice/review flags,
   duration bounds, strictly ordered cues, end-card hold ≥ 1.5 s, SFX inside
   the timeline. Run `npm run check`.
8. **Render + verify.** `npm run render -- <slug> --preview` (takes several
   minutes; a 60-s reel takes ~45 min — run it async and wait). Verify with ffprobe:
   1080×1920, 30 fps, H.264 + AAC, expected duration; `ebur128` ≈ −16 LUFS.
   Extract 6 frames from the *exported MP4* into a sheet and inspect it.
9. **Deliver** with `publish_chat_update` (video attachment). Attachments
   must be < 64 MB: the 60-s preview is ~115 MB, so attach a share copy
   (`ffmpeg -i preview.mp4 -c:v libx264 -crf 22 -preset slow -c:a copy
   -movflags +faststart <session files>/<slug>-share.mp4`, ~18 MB) and name
   the full master path. State whether
   narration is new or reused, credits used, and that pronunciation/visual
   review are pending the user's listening pass. Offer title, hashtags and a
   thumbnail (a still from the scene + bold kinetic headline).

## Craft rules (what made the pilot work)

**Camera**
- Portrait canvas → narrow horizontal FOV. Frame by *visible world width*
  with `shot(target, direction, width, fov = 46)`; never place the camera by
  guessed distance. The helper lifts the look-at so subjects sit below the
  kinetic-type zone.
- Camera is a list of `[start, end, pose, ease]` moves keyed to cues. Pattern:
  fast `expoInOut` whip (0.3–0.4 s) on an action, then a slow linear drift
  (push-in of ~10%) for the rest of the line. Never hold a static camera.
- Hard cuts are moves with `start === end` (e.g. the top-down cup lid).
  Use a cubic ease-in into the cut to sell it; follow with an `inOut` reveal.
- Impact = short decaying shake (`exp(-dt*18) * .07`, < 0.3 s) on the hit cue.

**Look**
- `ACESFilmicToneMapping`, `RoomEnvironment` PMREM lighting, one shadowed key
  light, soft shadows, paper-textured set built from seeded canvas noise.
- Objects are modelled in code (RoundedBox, Lathe, Tube, Edges) with
  canvas-texture faces (screens, card art). Mark illustrative items
  ("ILLUSTRATIVE CARD · NOT REAL DETAILS"). No logos or brand marks.
- Limited palette: cream paper, deep teal/green hero, one orange accent, ink
  black. One mood shift per reel is allowed (pilot: cream → night X-ray at the
  "andar" reveal).
- Reveal internals with transparency + glowing `EdgesGeometry` outline + scan
  line; keep the outer object ≥ ~35% opaque so it still reads as itself.
- Deterministic motion blur: average 1/3/6 sub-frames depending on
  `speed(t)`. No `Math.random()` or wall-clock time anywhere: seeking any
  frame must render identically.

**Typography (top zone, ~190–570 px)**
- One idea per shot, 1–4 words, huge. Mix bold grotesk with an italic serif
  for the punch word. Use props: stamps (NAHI), pills (✓ PAYMENT DONE),
  count-ups (₹2 → ₹20 → ₹200), staggered letters (`Letters`).
- Entrances use `back` overshoot + blur-in; exits blur-out. Wrap every
  kinetic block in `Shot` so it gets `data-settled` and is only
  overflow-checked once it has landed.
- Captions: full aligned transcript, readable cream panel at the bottom
  (top 1488, 196 high), dark variant in night scenes. Progress bar, grain and
  vignette on top. Nothing important within 120 px of the edges or behind the
  platform UI on the right/bottom.

**Sound**
- Every visual hit gets a sound: whoosh on whips, tap/click on contact,
  chime on success, pops on type, key ticks on count-ups, riser before a
  reveal, shimmer on the reveal, pop on the end card. Music ducks under voice.

**Structure for 15–30 s**
- Hook question (≤ 1.5 s) → concrete everyday example → one satisfying
  "physical" action → curiosity reveal → end card (≥ 1.5 s, "PART 2 /
  hook / Follow karo →"). Longer explainers keep one example object
  throughout and add reading pauses per README rules.

## Going beyond the pilot

Pick the ones that serve the story, and verify each with stills:
- `EffectComposer` bloom on emissive elements (NFC waves, screens) and a
  subtle depth-of-field in close-ups — keep deterministic.
- Match cuts between scales (card chip → circuit → electromagnetic field).
- Speed ramps: slow-motion right at the contact frame, then snap back.
- Diagrams that live in 3D space (labels anchored to objects, projected to
  screen with `vector.project(camera)`), instead of flat overlays.
- Particle/field visualisations for invisible physics (radio waves, current,
  data packets) built from instanced meshes.
- A recurring original mascot/prop that can reappear across related reels.
- Consistency across reels: same set, palette, end-card layout and SFX kit
  so a "Part 2" feels continuous.

## Pitfalls already solved
- Camera too close / letters stacking vertically: use `shot()` width framing
  and wrap letters in `.motion-word`.
- Overflow failures from in-flight transforms: check only `[data-settled]`.
- `pauseAfter` max is 3.5 s (for end cards); reels need ≥ 2 beats; short
  reels must total 15–90 s (`ceil(audio*30) + round(pause*30)` per beat).
- `holdCaptions` needs ~5.5 words/s reading time.
- Canvas text on a `RoundedBoxGeometry` bleeds onto its sides/top; put the
  texture on a front `PlaneGeometry` child instead.
- Tokens that hover above the phone must vanish when their zone's shot
  starts, or they float into later frames.
- Verify refactors of shared files with pixel PSNR against baseline stills
  of every existing motion reel (expect `inf`).
- WebGL context loss throws; always `dispose()` geometry/textures/PMREM.
