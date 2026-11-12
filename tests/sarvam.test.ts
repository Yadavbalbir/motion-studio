import assert from "node:assert/strict";
import test from "node:test";
import { decodeAudio, narrationRequest, synthesizeNarration } from "../scripts/sarvam";
import { assertTrialBudget } from "../scripts/sarvam-voice";
import { readReel, voiceKey } from "../scripts/lib";

const TEXT = "Cache repeated database reads बचाता है।";

function wavFixture() {
  const wav = Buffer.alloc(46);
  wav.write("RIFF", 0);
  wav.write("WAVE", 8);
  return wav;
}

test("successful synthesis sends the key only to the official endpoint and refuses redirects", async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(input, "https://api.sarvam.ai/text-to-speech");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("api-subscription-key"), "test-only-token");
    assert.ok(!String(init?.body).includes("test-only-token"));
    assert.deepEqual(JSON.parse(String(init?.body)), narrationRequest(TEXT));
    return new Response(JSON.stringify({ audios: [wavFixture().toString("base64")] }));
  };
  assert.deepEqual(await synthesizeNarration("test-only-token", TEXT, fetcher), wavFixture());
});

test("API failures stop without retries or leaking response bodies", async () => {
  for (const status of [401, 402, 403, 422, 429, 500]) {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls++;
      return new Response("sensitive provider diagnostics must not be logged", { status });
    };
    await assert.rejects(synthesizeNarration("test-only-token", TEXT, fetcher), (error: Error) => {
      assert.match(error.message, new RegExp(`HTTP ${status}`));
      assert.ok(!error.message.includes("sensitive"));
      assert.ok(!error.message.includes("test-only-token"));
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("network failure and missing credentials do not trigger fallbacks", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw new Error("private diagnostic"); };
  await assert.rejects(synthesizeNarration("", TEXT, fetcher), /SARVAM_API_KEY/);
  assert.equal(calls, 0);
  await assert.rejects(synthesizeNarration("test-only-token", TEXT, fetcher), /No retry/);
  assert.equal(calls, 1);
});

test("malformed audio cannot masquerade as successful narration", () => {
  assert.throws(() => decodeAudio({ audios: [] }), /invalid audio/);
  assert.throws(() => decodeAudio({ audios: ["!@#$"] }), /base64/);
  assert.throws(() => decodeAudio({ audios: [Buffer.from("not audio").toString("base64")] }), /WAV/);
  assert.throws(() => decodeAudio({ audios: [wavFixture().toString("base64"), wavFixture().toString("base64")] }), /invalid audio/);
});

test("narration uses Shubh at API pace 1, local tempo in the cache key, and bounded trial requests", async () => {
  const reel = await readReel("sql-vs-nosql");
  assertTrialBudget(reel);
  const request = narrationRequest(reel.beats[0].speech);
  assert.equal(request.pace, 1);
  assert.equal(request.speaker, "shubh_enhi_companion");
  assert.equal(request.model, "bulbul:v4-flash");
  assert.throws(() => narrationRequest("a".repeat(301)), /1-300/);
  assert.throws(() => narrationRequest(" "), /1-300/);
  const changed = structuredClone(reel);
  const key = voiceKey(changed, changed.beats[0].speech);
  changed.voice.speed = 1;
  assert.notEqual(key, voiceKey(changed, changed.beats[0].speech));
  changed.beats.push(...changed.beats.slice(0, 1).map((beat) => ({ ...beat, id: "extra-beat" })));
  assert.throws(() => assertTrialBudget(changed), /capped at 8/);
  changed.format = "explainer";
  assert.doesNotThrow(() => assertTrialBudget(changed));
  changed.beats.push(...Array.from({ length: 10 }, (_, i) => ({ ...reel.beats[0], id: `more-${i}` })));
  assert.throws(() => assertTrialBudget(changed), /capped at 18/);
});
