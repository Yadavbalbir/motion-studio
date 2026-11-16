// Render selected frames of a reel to JPEG and report overflow, without encoding a video.
// Usage (from the project root): npx tsx .github/skills/motion-reel/scripts/stills.ts <slug> <outdir> <frame...>
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { ROOT } from "../../../../scripts/lib";

// Headless Chromium on macOS otherwise draws WebGL on the CPU (SwiftShader), ~50x slower; use the Metal GPU.
const GPU_ARGS = process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : [];

const [slug, outdir, ...frames] = process.argv.slice(2);
if (!slug || !outdir || !frames.length) throw new Error("Usage: stills.ts <slug> <outdir> <frame...>");
await mkdir(outdir, { recursive: true });
const server = await createServer({ root: ROOT, configFile: false, server: { host: "127.0.0.1", hmr: false, watch: null } });
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === "string") throw new Error("Preview server did not start.");
const browser = await chromium.launch({ headless: true, args: GPU_ARGS });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (error) => console.error("pageerror", error.message));
  await page.goto(`http://127.0.0.1:${address.port}/?reel=${slug}&render=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.reelStudio, undefined, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  for (const value of frames.map(Number)) {
    await page.evaluate((frame) => window.reelStudio!.setFrame(frame), value);
    const overflow = await page.evaluate(() => window.reelStudio!.overflow());
    const file = path.join(outdir, `still-${String(value).padStart(4, "0")}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 88 });
    console.log(value, file, "overflow", JSON.stringify(overflow));
  }
} finally {
  await browser.close();
  await server.close();
}
