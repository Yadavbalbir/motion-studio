import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { ROOT, readReel } from "../scripts/lib";
import { makeTimeline } from "../src/model";

test("studio plays a storyboard, navigates scenes, renders aligned captions and reports load errors", async () => {
  const server = await createServer({
    root: ROOT, configFile: false,
    server: { host: "127.0.0.1", hmr: false, watch: null },
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/generated/*/timeline.json", (route) => route.fulfill({ status: 404, body: "Not prepared" }));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !!window.reelStudio);
    await page.evaluate(() => document.fonts.ready);
    assert.match(await page.locator(".mode-label").innerText(), /VOICE NOT GENERATED/);
    assert.equal(await page.locator(".reel.motion-reel.sql-motion").count(), 1);
    assert.equal(await page.locator(".preview-watermark").count(), 1);
    const play = page.getByRole("button", { name: "Play", exact: true });
    const bounds = await play.boundingBox();
    assert.ok(bounds && bounds.y + bounds.height <= 720, "Playback controls should fit a laptop viewport.");
    await play.click();
    await page.waitForFunction(() => Number(document.querySelector<HTMLInputElement>('input[aria-label="Timeline"]')!.value) > 40);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const sql = makeTimeline(await readReel("sql-vs-nosql"));
    await page.locator(".beat-list button").nth(2).click();
    assert.equal(Number(await page.locator('input[aria-label="Timeline"]').inputValue()), sql.beats[2].startFrame);
    await page.getByRole("checkbox", { name: "Safe zones" }).check();
    assert.equal(await page.locator(".safe-guide").count(), 1);

    const voiced = makeTimeline(await readReel("tap-pay-motion-pilot"));
    voiced.silent = false;
    voiced.beats.forEach((beat, index) => {
      const segments = voiced.reel.beats[index].captionSegments;
      const step = beat.durationFrames / segments.length;
      beat.captions = segments.map(({ caption: text }, i) => ({
        startFrame: Math.round(i * step), endFrame: Math.round((i + 1) * step), text,
      }));
    });
    const [first, second] = voiced.beats[0].captions!;
    await page.unroute("**/generated/*/timeline.json");
    await page.route("**/generated/tap-pay-motion-pilot/timeline.json", (route) => route.fulfill({ json: voiced }));
    await page.goto(`${url}/?reel=tap-pay-motion-pilot`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !!window.reelStudio);
    await page.evaluate((at) => window.reelStudio!.setFrame(at), first.startFrame + 1);
    assert.equal(await page.locator(".motion-caption").innerText(), first.text);
    await page.evaluate((at) => window.reelStudio!.setFrame(at), second.startFrame + 1);
    assert.equal(await page.locator(".motion-caption").innerText(), second.text);
    assert.equal(await page.locator(".preview-watermark").count(), 0);
    assert.deepEqual(errors, []);

    await page.goto(`${url}/?reel=missing-example`);
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /not found/);
    await page.goto(`${url}/?reel=..%2Fsecret`);
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /Cannot open this reel/);
  } finally {
    await browser?.close();
    await server.close();
  }
});
