import { z } from "zod";

// The selected voice: Shubh at pace 1; speed is applied locally with ffmpeg atempo (never twice).
export const SARVAM_VOICE = {
  model: "bulbul:v4-flash",
  speaker: "shubh_enhi_companion",
  language_code: "hi-IN",
  pace: 1,
  speech_sample_rate: 48000,
  output_audio_codec: "wav",
} as const;

const responseSchema = z.object({
  request_id: z.string().optional(),
  audios: z.array(z.string().min(1).max(12_000_000)).length(1),
});

export function decodeAudio(payload: unknown): Buffer {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Sarvam returned an invalid audio response. No retry was made.");
  const base64 = parsed.data.audios[0];
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error("Sarvam returned malformed base64 audio.");
  }
  const audio = Buffer.from(base64, "base64");
  if (audio.length <= 44 || audio.toString("ascii", 0, 4) !== "RIFF" ||
      audio.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Sarvam did not return a non-empty WAV file.");
  }
  return audio;
}

export function narrationRequest(text: string) {
  if (!text.trim() || [...text].length > 300) throw new Error("Narration must contain 1-300 characters per request.");
  return { ...SARVAM_VOICE, text };
}


export async function synthesizeNarration(key: string, text: string, fetcher: typeof fetch = fetch): Promise<Buffer> {
  const request = narrationRequest(text);
  if (!key || key.trim() !== key || /[\s\\]/.test(key)) throw new Error("Set a valid SARVAM_API_KEY in the process environment.");
  let response: Response;
  try {
    response = await fetcher("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": key },
      body: JSON.stringify(request),
      redirect: "error",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new Error("Sarvam request failed or timed out. No retry was made; check your dashboard before trying again.");
  }
  if (!response.ok) {
    const reasons: Record<number, string> = {
      400: "The request was rejected. Check model and voice parameters.",
      401: "Authentication failed. Check or rotate the API key.",
      402: "Available credits are exhausted. Stopping; no top-up or paid fallback.",
      403: "The key is invalid or does not have permission for this API.",
      422: "The selected model or voice parameters were not accepted.",
      429: "Rate limit reached. Stopping without an automatic retry.",
    };
    throw new Error(`Sarvam HTTP ${response.status}: ${reasons[response.status] ?? "The provider could not complete the request."}`);
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new Error("Sarvam returned unreadable JSON. No retry was made."); }
  return decodeAudio(payload);
}
