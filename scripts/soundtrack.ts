import { writeFile } from "node:fs/promises";
import type { Timeline } from "../src/model";
import { motionSfxFor, type SfxKind } from "../src/motion/sfx";

const sfxLength: Record<SfxKind, number> = { whoosh: .42, tap: .3, chime: .7, pop: .2, key: .1, riser: .7, shimmer: 1.1, thud: .35, buzz: .32 };

// Original synthesized effects for shot-locked motion reels.
function sfx(kind: SfxKind, age: number, random: number): number {
  const tau = Math.PI * 2;
  const length = sfxLength[kind];
  const fadeOut = Math.max(0, 1 - age / length);
  if (kind === "whoosh") return random * Math.sin(Math.PI * age / length) ** 2 * .05;
  if (kind === "tap") return (Math.sin(tau * (180 - age * 260) * age) * Math.exp(-age * 30) * .16) + random * Math.exp(-age * 90) * .05;
  if (kind === "chime") return (Math.sin(tau * 1046.5 * age) * Math.exp(-age * 7) + (age > .11 ? Math.sin(tau * 1568 * (age - .11)) * Math.exp(-(age - .11) * 6) : 0)) * .035;
  if (kind === "pop") return Math.sin(tau * (620 - age * 1800) * age) * Math.exp(-age * 28) * .06;
  if (kind === "key") return Math.sin(tau * 1900 * age) * Math.exp(-age * 60) * .03;
  if (kind === "riser") return (random * .4 + Math.sin(tau * (200 + age * 900) * age)) * (age / length) ** 2 * fadeOut ** .2 * .035;
  if (kind === "thud") return (Math.sin(tau * (95 - age * 120) * age) * Math.exp(-age * 16) * .2) + random * Math.exp(-age * 70) * .03;
  if (kind === "buzz") return Math.sign(Math.sin(tau * 110 * age)) * Math.exp(-age * 9) * fadeOut * .028;
  return [1318.5, 1760, 2349.3].reduce((sum, hz, i) => sum + Math.sin(tau * hz * age + i) * Math.exp(-age * (3 + i)), 0) * .015;
}

export async function makeSoundtrack(timeline: Timeline, filename: string): Promise<void> {
  const rate = 48000;
  const seconds = timeline.totalFrames / timeline.fps;
  const length = Math.round(seconds * rate);
  const wav = Buffer.alloc(44 + length * 4);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(length * 4, 40);
  const beat = 60 / 96;
  const chords = [[48, 55, 60, 63], [44, 51, 56, 60], [51, 58, 63, 67], [46, 53, 58, 62]];
  const noteHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
  const motion = motionSfxFor(timeline);
  const events = motion.length ? [] : timeline.beats.slice(1).map((item) => item.startFrame / timeline.fps);
  const tau = Math.PI * 2;
  let noise = 17;
  let previousNoise = 0;
  for (let i = 0; i < length; i++) {
    const time = i / rate;
    const chordIndex = Math.floor(time / (beat * 8)) % chords.length;
    const chord = chords[chordIndex];
    const chordAge = time % (beat * 8);
    const padEnvelope = Math.min(1, chordAge / 0.3, (beat * 8 - chordAge) / 0.45);
    let left = 0;
    let right = 0;
    for (const [index, note] of chord.entries()) {
      const hz = noteHz(note);
      const pad = (Math.sin(tau * hz * time) + 0.16 * Math.sin(tau * hz * 2 * time)) * 0.004 * padEnvelope;
      left += pad * (index % 2 ? 0.7 : 1);
      right += pad * (index % 2 ? 1 : 0.7);
    }
    const step = Math.floor(time / (beat / 2));
    const age = time % (beat / 2);
    const pitch = noteHz(chord[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] + 12);
    const pluck = Math.sin(tau * pitch * age) * Math.min(1, age / 0.008) * Math.exp(-age * 13) * 0.008;
    const pulseAge = time % (beat * 2);
    const pulse = Math.sin(tau * 53 * pulseAge + 1.4 * (1 - Math.exp(-pulseAge * 45))) *
      Math.min(1, pulseAge / 0.005) * Math.exp(-pulseAge * 22) * 0.008;
    noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0;
    const random = noise / 0xffffffff * 2 - 1;
    const hat = (random - previousNoise) * Math.exp(-age * 100) * 0.0007;
    previousNoise = random;
    let effect = 0;
    for (const start of events) {
      const elapsed = time - start;
      if (elapsed >= 0 && elapsed < 0.22) {
        const envelope = Math.sin(Math.PI * elapsed / 0.22) ** 2;
        effect += (Math.sin(tau * (420 * elapsed + 1350 * elapsed ** 2)) * 0.012 + random * 0.002) * envelope;
      }
    }
    for (const cue of motion) {
      const elapsed = time - cue.at;
      if (elapsed >= 0 && elapsed < sfxLength[cue.kind]) effect += sfx(cue.kind, elapsed, random);
    }
    const fade = Math.max(0, Math.min(1, time / 0.5, (seconds - time) / 0.8));
    left = (left + pluck + pulse + hat + effect) * fade * 3.2;
    right = (right + pluck * 0.8 + pulse + hat * 0.8 + effect) * fade * 3.2;
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 32767), 46 + i * 4);
  }
  await writeFile(filename, wav);
}
