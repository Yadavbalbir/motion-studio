import { writeFile } from "node:fs/promises";
import { generated, prepare, readReel, source } from "./lib";
import { slugSchema } from "../src/model";
import { generateSarvam } from "./sarvam-voice";
import { alignCaptions } from "./captions";

async function main() {
  const [command, rawSlug, ...flags] = process.argv.slice(2);
  if (!command || command === "help") {
    console.log(`Commands:
  npm run reel -- new <slug>                   Create an editable storyboard
  npm run reel -- validate <slug>              Validate the content contract
  npm run voice -- <slug> --trial-credits-confirmed  Generate Sarvam narration + aligned captions
  npm run reel -- prepare <slug>               Measure audio and build timeline + SRT
  npm run reel -- prepare <slug> --silent-preview
  npm run render -- <slug> [--preview] [--draft]
  npm run render -- <slug> --silent-preview [--draft]
Final export requires narration and all three review approvals.`);
    return;
  }
  const slug = slugSchema.parse(rawSlug);
  if (command === "new") {
    if (flags.length) throw new Error("new does not accept additional flags.");
    const template = await readReel("sql-vs-nosql");
    const reel = { ...template, slug, title: `Draft: ${slug}`, topic: slug,
      review: { technical: false, pronunciation: false, visuals: false } };
    await writeFile(source(slug), JSON.stringify(reel, null, 2) + "\n", { flag: "wx" });
    console.log(`Created ${source(slug)}. It contains EXAMPLE CONTENT: replace the script, sources, visuals, and publishing copy.`);
  } else if (command === "validate") {
    if (flags.length) throw new Error("validate does not accept additional flags.");
    const reel = await readReel(slug);
    console.log(`Valid: ${reel.beats.length} beats, ${reel.beats.reduce((sum, beat) => sum + beat.seconds, 0)} estimated seconds.`);
  } else if (command === "prepare") {
    if (flags.some((flag) => flag !== "--silent-preview")) throw new Error("Unknown prepare option.");
    const timeline = await prepare(slug, flags.includes("--silent-preview"));
    console.log(`Prepared ${timeline.totalFrames / timeline.fps}s ${timeline.silent ? "SILENT STORYBOARD" : "narrated timeline"} in ${generated(slug)}.`);
  } else if (command === "voice") {
    if (flags.length !== 1 || flags[0] !== "--trial-credits-confirmed") throw new Error("Sarvam requires --trial-credits-confirmed; no paid fallback.");
    const reel = await readReel(slug);
    const key = process.env.SARVAM_API_KEY;
    delete process.env.SARVAM_API_KEY;
    await generateSarvam(reel, key);
    await alignCaptions(slug);
  } else throw new Error(`Unknown command: ${command}. Run npm run reel -- help.`);
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
