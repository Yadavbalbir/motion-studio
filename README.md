# explainer-reel-studio

Give it a topic, such as **"Rate Limiting"**, and get a vertical reel for
YouTube Shorts and Instagram Reels:

- original Three.js 3D scenes, camera moves and kinetic typography;
- natural Hinglish narration (Sarvam Shubh) with full Roman-Hinglish captions,
  aligned to the recording on your machine;
- original music and SFX, synthesized in code and timed to the visuals;
- a 1080×1920, 30 fps, H.264/AAC master, with an SRT file and publishing copy.

The topic → script → animation work is done by an AI coding agent (GitHub
Copilot) using the bundled skill
[`.github/skills/motion-reel/SKILL.md`](.github/skills/motion-reel/SKILL.md).
This repo supplies the engine, the guardrails and two reference reels:

| Example | Length | Shows |
|---|---|---|
| `tap-pay-motion-pilot` | 15 s | how contactless payment works, one cinematic hook |
| `sql-vs-nosql` | ≈ 60 s | a full explainer: one example, four demos, a decision rule |

## Setup

Requirements: Node 22+, ffmpeg/ffprobe, Python 3.11, and a
[Sarvam](https://www.sarvam.ai/) API key on free/trial credits.

```sh
npm install
npx playwright install chromium
python3.11 -m venv .venv
.venv/bin/pip install -r voice/requirements.txt   # local caption alignment only
export SARVAM_API_KEY=...                          # environment only, never commit it
npm run check
```

On first use, caption alignment downloads Whisper base (about 139 MiB) into the
git-ignored `.models/whisper/` folder. Narration audio stays on your machine
during alignment.

## Making a reel

Ask the agent, for example: *"Create a reel: Rate Limiting"*. The skill then:

1. researches the topic and writes an 8-beat Hinglish script (Devanagari
   speech, Roman captions, sources), then **stops once for your approval**;
2. generates narration with `npm run voice -- <slug> --trial-credits-confirmed`;
3. builds a new 3D visual family for the topic, iterating with stills;
4. renders a narrated preview and suggests a title, a short description and
   hashtags.

Before the final export, listen to the preview and set the three `review` flags.

```sh
npm run dev                                   # studio: http://127.0.0.1:5173/?reel=<slug>
npm run reel -- new <slug>                    # copy the example storyboard (replace all content)
npm run reel -- validate <slug>
npm run voice -- <slug> --trial-credits-confirmed
npm run reel -- prepare <slug>                # re-time from existing audio, no credits
npm run render -- <slug> --silent-preview --draft
npm run render -- <slug> --preview
npm run render -- <slug>                      # final; requires narration and approved reviews
npx tsx .github/skills/motion-reel/scripts/stills.ts <slug> <outdir> <frames...>
```

Without a prepared voice, the studio shows a silent storyboard marked as a
preview. The studio player plays the narration only; the exported MP4 has the
full mix.

## Content contract

`src/model.ts` defines the reel JSON in `public/reels/<slug>.json`:

- `format`: `short` (15–90 s) or `explainer` (90–120 s). These limits apply to
  the exported duration, which comes from the audio as measured.
- Each beat has a `speech` field (Devanagari, with English technical terms) and
  a Roman-Hinglish `caption`. `captionSegments` must join up to both texts
  exactly, so captions can never become summaries.
- Every beat uses the same `visual` family (for example `sql-motion`).
- `review.technical`, `review.pronunciation` and `review.visuals` start as
  `false`. Reset them after any content or voice change.

## Voice policy

- Voice: Sarvam `bulbul:v4-flash`, speaker `shubh_enhi_companion`, requested
  at pace 1.
- Speed (for example 1.5×) is applied locally with ffmpeg `atempo`, which keeps
  the pitch. Never apply speed twice.
- Each run makes a bounded number of requests: 8 for `short`, 18 for
  `explainer`. There are no retries and no paid fallback. Audio is cached by its
  text and voice, so visual edits never cost credits.
- Use free or trial credits only. Keep keys out of files and logs.

## Adding a visual family

1. Add `<topic>-motion` to the `visual` enum in `src/model.ts`.
2. Create these files:
   - `src/<topic>MotionModel.ts`: cues found from caption text, plus SFX cues;
   - `src/<Topic>MotionScene.ts`: the Three.js set, objects and camera;
   - `src/<Topic>MotionFrame.tsx` and `src/<topic>Motion.css`: kinetic text, captions and the end card.
3. Register the frame in `src/Reel.tsx` and the SFX in `src/motion/sfx.ts`.
4. Add `tests/<topic>-motion.test.ts`, then run `npm run check`.

Shared building blocks live in `src/motion/`. Copy the `sql-vs-nosql` files as
a structural template. The full set of craft rules is in the skill.

## Delivery package

`output/<slug>/` contains:

- the MP4;
- a cover still;
- SRT captions;
- the transcript;
- platform copy;
- references;
- the timeline;
- a media verification report.

Preview files have a `preview` prefix. Only a reviewed final render writes
`reel.mp4`.

| Property | Final master |
|---|---|
| Frame | 1080×1920, vertical 9:16 |
| Motion | 30 fps, deterministic frame-based animation |
| Video | H.264, yuv420p, MP4 with fast start |
| Audio | AAC, 48 kHz, two-pass loudness normalization to −16 LUFS / −1.5 dBTP |
| Captions | Full spoken Roman Hinglish, locally aligned and burned in, plus SRT |
