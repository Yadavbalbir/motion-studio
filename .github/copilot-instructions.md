# Reel production instructions

Read README.md and `.github/skills/motion-reel/SKILL.md` before creating or
modifying reels. When the user gives only a topic, follow the skill end to end.
When asked for a reel without a topic, choose a useful engineering topic.

- Purpose: accurate, high-quality engineering explainers in Hinglish, using
  original 3D motion graphics. Deliver vertical 1080×1920 masters for YouTube
  Shorts and Instagram Reels.
- Voice: Sarvam Shubh (`shubh_enhi_companion`, `bulbul:v4-flash`).
  - Use free or trial credits only: no paid top-ups, no automatic retries.
  - Never persist credentials in files.
  - Request pace 1 from the API; apply the chosen speed locally with ffmpeg
    `atempo`, and never apply it twice.
- Script: write `speech` in Devanagari with English technical terms, and full
  Roman-Hinglish `captionSegments`, aligned locally. Never replace the spoken
  transcript with summary captions.
- Approval: get one approval of the script and sources before spending voice
  credits.
- Facts: check claims against authoritative sources and include limitations.
  Never invent performance numbers.
- Visuals: no brand logos or real card or account details; label illustrative
  props as illustrative.
- Previews: keep silent previews and narrated reels clearly distinguished.
- Review:
  - Never set pronunciation approval without listening to the actual recording.
    Ask the user to do the listening pass if you cannot inspect audio.
  - Reset review flags after changes.
- Verification:
  - Run `npm run check` after code changes.
  - For visual changes, render stills and inspect representative frames.
- Publishing text: a title, a short and focused description (don't recap the
  whole video), a CTA and a few hashtags.
- Never publish, upload, commit or push without a separate user request.
