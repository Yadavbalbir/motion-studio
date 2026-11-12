# Contributing to Motion Studio

Thanks for contributing! Bug reports, documentation, tests, accessibility fixes
and new visual families are welcome. Be respectful and constructive when
collaborating.

## Getting started

1. Fork the repository and clone your fork.
2. Follow the [README setup](README.md#setup). For code changes and automated
   checks, install Node 22+, ffmpeg/ffprobe, npm dependencies and Playwright's
   Chromium. Python and the alignment environment are needed only for local
   caption alignment.
3. Create a focused branch for your change.
4. Run `npm run dev` to open the studio and `npm run check` before submitting.

The automated checks do not require a Sarvam key or spend voice credits.
On Linux, `npx playwright install --with-deps chromium` installs Chromium and
its system dependencies. ffmpeg must also be on your PATH.

## Proposing a change

Use an issue to describe a reproducible bug or discuss a substantial feature
before implementing it. Search existing issues and pull requests first.
Keep pull requests small, explain the problem and solution, link related
issues and describe the checks you ran. Add focused tests for behavior you
introduce or fix, and update directly related documentation.

For visual changes, render and inspect representative stills and include
screenshots or a clearly labeled silent preview where useful. Do not include
generated media, local caches, credentials or personal account details in Git.
Do not post sensitive information in issues, logs or pull requests.

## Reels and visual families

Read [the production instructions](.github/copilot-instructions.md) and
[the motion-reel skill](.github/skills/motion-reel/SKILL.md) before changing
reels. Follow the README's
[visual family guide](README.md#adding-a-visual-family).

- Verify technical claims against authoritative sources and include limitations.
- Keep Devanagari speech and full Roman-Hinglish captions aligned; captions
  must not summarize or omit the spoken transcript.
- Get script and source approval before spending narration credits. Use only
  free/trial credits, with no paid fallback or automatic retries.
- Never commit API keys. Supply them through the process environment only.
- Reset review flags after content or voice changes. Pronunciation approval
  requires listening to the actual recording.
- Use original or appropriately licensed assets. Avoid brand logos and real
  card/account details, and label illustrative props.

## Security and licensing

Report vulnerabilities privately using [SECURITY.md](SECURITY.md), not a public
issue.

By submitting a contribution, you agree that it is available under the project's
[MIT License](LICENSE). Only contribute material you have the right to share,
and preserve required third-party notices. The package's `private: true` prevents
accidental npm publication; it does not restrict contributions or the MIT license.
