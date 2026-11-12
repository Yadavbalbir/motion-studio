import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rename, rm, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { FPS, WIDTH, HEIGHT, assertPublishable, slugSchema } from "../src/model";
import { ROOT, assertExport, generated, prepare, probe } from "./lib";
import { assembleNarration } from "./audio";

async function main() {
  const [rawSlug, ...flags] = process.argv.slice(2);
  const slug = slugSchema.parse(rawSlug);
  if (flags.some((flag) => !["--silent-preview", "--preview", "--draft"].includes(flag))) throw new Error("Unknown render option.");
  const silent = flags.includes("--silent-preview");
  const draft = flags.includes("--draft");
  const preview = silent || flags.includes("--preview");
  if (draft && !preview) throw new Error("--draft is preview-only. Final exports are always 1080x1920.");
  const timeline = await prepare(slug, silent);
  if (!preview) assertPublishable(timeline);
  const destination = path.join(ROOT, "output", slug);
  await mkdir(destination, { recursive: true });
  const temp = await mkdtemp(path.join(destination, ".render-"));
  const server = await createServer({
    root: ROOT,
    configFile: false,
    server: { host: "127.0.0.1", hmr: false, watch: null },
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let encoder: ReturnType<typeof spawn> | undefined;
  let encoderDone: Promise<void> | undefined;
  try {
    const audio = silent ? undefined : await assembleNarration(timeline, path.join(generated(slug), "audio"), temp);
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") throw new Error("Preview server did not start.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: draft ? 0.5 : 1 });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${address.port}/?reel=${slug}&render=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !!window.reelStudio, undefined, { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    for (const beat of timeline.beats) {
      const offsets = new Set([
        ...[0.2, 0.5, 0.85].map((progress) => Math.floor(beat.durationFrames * progress)),
        ...(beat.captions ?? []).map((cue) => Math.floor((cue.startFrame + cue.endFrame) / 2)),
      ]);
      for (const offset of offsets) {
        await page.evaluate(async (frame) => {
          window.reelStudio!.setFrame(frame);
          await document.fonts.ready;
        }, beat.startFrame + offset);
        const overflow = await page.evaluate(() => window.reelStudio!.overflow());
        if (overflow.length) throw new Error(`Text overflow in ${beat.id}: ${overflow.join(", ")}. Shorten text or adjust the visual.`);
      }
    }
    const output = path.join(temp, "reel.mp4");
    const args = ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-vcodec", "mjpeg",
      "-framerate", String(FPS), "-i", "pipe:0",
      ...(audio ? ["-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"] : ["-an"]),
      "-c:v", "libx264", "-preset", draft ? "ultrafast" : "medium", "-crf", draft ? "23" : "18",
      "-vf", "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-pix_fmt", "yuv420p", "-color_range", "tv", "-r", String(FPS), "-movflags", "+faststart",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-t", String(timeline.totalFrames / FPS), output];
    encoder = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    let encoderError: Error | undefined;
    encoder.stderr!.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-8000); });
    encoder.stdin!.on("error", (error) => { encoderError = error; });
    encoderDone = new Promise<void>((resolve, reject) => {
      encoder!.on("error", reject);
      encoder!.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg failed (${code}): ${stderr}`)));
    });
    // Observe an early encoder failure while the browser is still producing frames.
    void encoderDone.catch((error: Error) => { encoderError = error; });
    for (let frame = 0; frame < timeline.totalFrames; frame++) {
      if (encoderError) throw encoderError;
      if (pageErrors.length) throw new Error(pageErrors.join("\n"));
      await page.evaluate((value) => window.reelStudio!.setFrame(value), frame);
      const image = await page.screenshot({ type: "jpeg", quality: draft ? 85 : 95 });
      if (!encoder.stdin!.write(image)) await once(encoder.stdin!, "drain");
      if (frame % (FPS * 5) === 0) console.log(`Rendering ${(frame / FPS).toFixed(0)} / ${(timeline.totalFrames / FPS).toFixed(1)} seconds`);
    }
    encoder.stdin!.end();
    await encoderDone;
    const info = await probe(output);
    assertExport(info, timeline, draft);
    const name = preview ? `preview${silent ? "-silent" : ""}${draft ? "-draft" : ""}` : "reel";
    await page.evaluate(() => window.reelStudio!.setFrame(45));
    await page.screenshot({ path: path.join(temp, "cover.png") });
    await rename(output, path.join(destination, `${name}.mp4`));
    await rename(path.join(temp, "cover.png"), path.join(destination, `${name}-cover.png`));
    for (const file of ["captions.srt", "transcript.txt", "publishing.json", "timeline.json"]) {
      await copyFile(path.join(generated(slug), file), path.join(destination, `${name}-${file}`));
    }
    await writeFile(path.join(destination, `${name}-verification.json`), JSON.stringify({
      mode: preview ? "PREVIEW_NOT_FOR_PUBLISHING" : "FINAL",
      renderedAt: new Date().toISOString(), ...info,
    }, null, 2) + "\n");
    console.log(`Exported ${path.join(destination, `${name}.mp4`)}${preview ? " (preview, not a finished reel)" : ""}`);
  } finally {
    if (encoder && encoder.exitCode === null && encoder.signalCode === null) encoder.kill("SIGTERM");
    if (encoderDone) await encoderDone.catch(() => undefined); // Original failure is propagated by the try block.
    await browser?.close();
    await server.close();
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
