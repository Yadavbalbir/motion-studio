# Script craft: write reels that sound like a creator

Read this before writing the 8-beat script. It turns a topic into a script
people finish, in natural English-heavy Hinglish, then into a publishing
package. Numbers quoted from creator playbooks (first-3-second drop-off,
muted viewing, and so on) are heuristics for decisions, never on-screen
claims.

## The job

A reel is decided in the first 1–2 seconds and kept by the next five. The
metric is watch-through, then sends and saves. Every line must grab, teach,
or set up the payoff; cut the rest. The hook is a promise: keep it line after
line, never bait-and-switch.

## Workflow

1. **One idea, one running example.** Write "after watching, the viewer
   knows ___" in one sentence. Pick one everyday Indian example the viewer has
   lived (Tatkal booking, UPI payment, a food order) and keep it through the
   whole reel.
2. **Find one real, specific number** for the hook from an authoritative
   source (government release, official docs, the company's own post). A
   sourced number with a familiar name beats any adjective. Speak it rounded
   down ("31,000 se zyada"), show the exact value on screen.
3. **Write 3 hooks from 3 different mechanisms** (below), each as spoken line
   + on-screen card (≤ 6 words, one accent word) + frame-0 visual. Score each
   /10 and keep ≥ 7.
4. **Write the payoff first**, then the body that earns it.
5. **Humanize pass**, then the gates at the end of this file.
6. Present the scored hooks + script + sources for the one approval.

## Hooks

Three channels at once: a moving frame 0 (never a fade from black), an
on-screen card readable on mute, and a spoken line of ≤ 12 words with the
topic in the first 5.

| Mechanism | Shape | Example (series voice) |
|---|---|---|
| Real record / number | [Exact number] [familiar thing]. Kaise? | "Ek minute mein, 31,000 se zyada train tickets. Kaise?" |
| Mid-scene outage | [Time], [place], [what broke]. | "Ten AM. Tatkal open. Server down." |
| Everyday magic | [Daily action], [short time]. Peeche kya hua? | "UPI pay dabaya, do second mein done. Peeche kya hua?" |
| Their words | "[What devs say]." [3-word flip] | "'Bas ek aur server add karo.' Yahi galti hai." |
| Myth question | [Belief]? Hamesha nahi. | "Zyada servers matlab fast app? Hamesha nahi." |
| A vs B | [A] ya [B]? [Twist] | "SQL ya NoSQL? Galat question hai." |
| It wasn't that | [Problem], aur reason [obvious cause] nahi tha. | "Site slow thi. Reason server nahi tha." |
| Identity call-out | Agar aap [person] ho, [stake]. | "Backend interview hai? Yeh pakka poochenge." |
| Stakes | Ek [small thing], aur [big consequence]. | "Ek seat, do log, dono ke paas ticket." |

**Score 0–2 on each:** Specific (scene/object/sourced number), Tension (a gap
that must close), Viewer (they see their own app, seat, payment), Fast (≤ 12
words), True (the body pays it off). Name the weakest point below 2.

**Never open with** a greeting ("Namaste doston", "Hey guys"), "Aaj ki video
mein", the series tag, "Kya aap jaante hain" + a known fact, or a yes/no
question with an obvious answer.

## Structure that performed best: POV escalation

The viewer is the engineer, and each fix creates the next problem. Every beat
ends on "Par ab…", so every line opens the next question.

| Beat | Job | Day 6 example |
|---|---|---|
| 1 | Hook (real number) → series tag (≤ 8 words, after the hook) | "Ek minute mein, 31,000 se zyada train tickets… Welcome to Day 6 of 100, Decoding System Design." |
| 2 | POV + the break | "Chalo, aap engineer ho. 10 AM, Tatkal open… 10:01. Server down." |
| 3–5 | Fix → new problem, ×3 | "Fix one… Site wapas up. Par ab database par poora pressure." |
| 5 end | Mid-point payoff | "Congrats, aapne distributed system bana diya." |
| 6 | Re-hook at 40–60 % | "Par ab aata hai final boss: network." |
| 7 | The dilemma, as a viewer choice | "Booking roko? Ya chalne do?" |
| 8 | Rule + loop to hook + one ask + follow | "…aise records ke peeche kya lagta hai. Roko ya chalne do? Comment karo, aur follow karo sudoengineer.ai." |

Other shapes (same hook and ending rules): Myth-bust, A vs B, Behind the
scenes ("aap tap karte ho, peeche 3 hops"), Real incident (sourced only).

## News-jack and the frame-0 template

Patterns seen across top Indian 3D-explainer channels (different niches,
same mechanics). Borrow the mechanics, never another creator's lines, art or
branding.

**Topic: ride this week's news.** Pick, from the series plan, the concept that
explains what India is talking about now: an outage (UPI down → retries and
idempotency), a sale crash (Big Billion Days → caching and queues), a
streaming record (IPL → CDNs), a festival rush (Tatkal → scaling). The
audience already cares before second 1. Verify the event from an
authoritative source the day you write.

**Frame 0 is the climax, not the setup.** Start the scene in its most
dramatic state (the server already falling, the train already on fire), then
explain how we got there. Lay `NewsHook` (`src/motion/NewsHook.tsx`) over it:
a red title bar of 2–4 words the viewer already knows ("Tatkal Rush",
"UPI Down"), one emoji, and a round proof inset: a sourced number
(`{ stat, label, credit }`) or a photo the creator has rights to
(`{ src, alt, credit }`). Use `at={-0.4}` so it is fully on screen at frame 0.

**First spoken line, five shapes** (all must be true and sourced):

| Shape | System design example |
|---|---|
| Superlative + number | "India ka sabse bada payment day… ek din mein ___ crore UPI transactions." |
| A person + a specific | "Ek engineer ne sirf ek line change ki… aur poora app down." (a real, sourced incident) |
| Shared memory | "Yaad hai, pichhli sale mein app khulte hi crash ho gaya tha?" |
| Outrage reaction | "UPI phir se down? Kya tamasha hai bhai…" |
| Buzzword repeat | "Kafka… Kafka toh sab use kar rahe hain… par kyun?" |

Drop in mid-sentence, land the specific (number, name, age, date) by second
3, and let captions trail with "…" at cliffhangers.

**Title:** "[2–4 word topic] (3D) · Day N/100", with 🤯 only when the story is
truly shocking. **Captions:** for news-jack reels, the opt-in
`motion-caption-bold` style (white, black outline, no panel) reads like
the platform-native look. **Face:** a creator reacting on camera in the lower
third builds trust; if the creator records it, plan the 3D for the top 60 %.

## Lines

- One breath per line: 4–15 words, ≤ ~4 s spoken. Vary length; a 3-word line
  after a 14-word one sounds human.
- Talk to one person ("aap"), never "doston" or "you guys".
- Show, then name: the visual first, the jargon second.
- Never three abstract lines in a row; the third becomes the example.
- Numbers only from sources. Missing → `{{number}}` and ask.
- One false contrast ("X nahi, Y hai") at most.

## English-heavy Hinglish (series default)

- English carries the meaning: nouns, verbs, tech terms, most phrases
  ("handle karta hai", "down ho gaya", "split ho jaaye").
- Hindi only as light glue: hai, ho, ko, se, mein, par, aur, to, jab, kaise,
  kya, yahi, sirf, ab, phir, lekin, yaani.
- Avoid heavy or formal Hindi: chaal, sambhalna, suljhana, jhelna,
  bharosemand, prakriya, uplabdh, mahatvapurn, avashyak.
- Speech field: Hindi glue in Devanagari, English in Latin script (the
  repo contract). Write numbers and handles as words ("Day six of one
  hundred", "Ten AM", "sudo engineer dot AI"); keep digits and the real
  handle in captions.
- Pace: Sarvam Shubh at 1.5× runs ~3.2–3.7 caption words per second
  (`sql-vs-nosql`: 194 words ≈ 60 s). Budget ~180–200 words for 60 s; the
  character estimate in SKILL.md undercounts Latin-heavy text.

## Humanize (cut these)

| Tell | Instead |
|---|---|
| Namaste doston / Aaj ki video mein / Chaliye shuru karte hain | start with the hook |
| Kya aapne kabhi socha hai… | a scene or a specific question |
| Yeh bahut important topic hai | show the stake |
| Samajh gaye na? / Toh yeh tha aaj ka topic | cut; end on the payoff |
| Like, share, subscribe | one specific ask |
| delve, leverage, unlock, seamless, robust, game-changer | say the plain thing |
| "The result?" "Best part?" reveal questions | say the result |
| Staccato triples ("No crash. No wait. Sirf speed.") | one real sentence |
| Recap endings | end on the payoff + ask |

## Ending

- **One spoken ask** plus the follow line: a two-option comment question the
  viewer can answer in one word ("roko ya chalne do?"), then "follow karo
  <handle>". Ask the creator for their handle once and reuse it.
- Echo a word or number from the hook in the last lines so the replay
  loops.
- Never "thanks for watching" or a summary.

## Packaging (deliver with the reel)

- **Thumbnail / cover:** render a clean frame of the most dramatic moment
  with all overlays hidden (inject CSS that hides `.motion-kinetic`,
  `.motion-caption`, `.motion-progress`, grain, notes), then compose the hook
  text on top at 1080×1920. Keep every word inside the profile-grid 3:4 crop
  (y ≈ 240–1680). One giant number or phrase, one stamp, series chip, handle.
- **Instagram caption:** first ~125 characters carry the keyword and the hook
  (they show before "more"); 2–4 short lines; the comment question; follow
  line; source + "illustrative" note when a real brand is mentioned; ≤ 5
  specific hashtags; no em dashes, no emoji bullets. Add alt text.
- **YouTube title:** the searched term + curiosity, then `#shorts`.
- **Pinned comment / lead magnet:** "Comment <KEYWORD> for the full PDF"
  works only when the PDF exists and delivery (manual DM or an automation) is
  set up. Use one caps keyword tied to the reel (e.g. IRCTC). Build the PDF as
  branded HTML printed with Playwright (`page.pdf`), check every page as an
  image, and cite sources with links.

## Gates (all pass before showing the user)

1. Best hook ≥ 7/10, said in ≤ 3 s.
2. One promise from hook to payoff; no second topic.
3. One specific only this reel has (sourced number, real record, running example).
4. Re-hook at 40–60 %.
5. No line over ~4 s; total within budget at the measured pace.
6. Humanize list clean; English-heavy Hinglish; numbers spelled out in speech.
7. Every claim sourced; real brands labelled illustrative where the system is invented.

## Credits

Distilled from open-source creator skills, mostly MIT-licensed:
Jakeschincariol/instagram-agent-skill, Melvynx/video-agent-skills,
social-media-skills/skills, charlie947/social-media-skills,
iart-ai/tiktok-video-skills, scrollmark/social-skills,
rediumvex/viral-hooks-skill, ericrisco/rsc-harness,
alexsmedile/hormozi-skills, plus what the Day 6 reel taught us in review.
