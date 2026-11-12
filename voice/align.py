import argparse
import hashlib
import json
import math
import re
from pathlib import Path

import soundfile as sf
import stable_whisper
import torch


def digest(value):
    return hashlib.sha256(value).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.slug):
        raise ValueError("Invalid reel slug.")
    root = Path(__file__).resolve().parents[1]
    reel = json.loads((root / "public/reels" / f"{args.slug}.json").read_text())
    directory = root / "public/generated" / args.slug
    destination = directory / "captions-aligned.json"
    existing = json.loads(destination.read_text()) if destination.exists() else {"beats": {}}
    result = {"engine": "stable-ts-2.19.1-whisper-base", "beats": {}}
    model = None
    torch.set_num_threads(4)
    for beat in reel["beats"]:
        parts = beat["captionSegments"]
        if " ".join(part["speech"] for part in parts) != beat["speech"]:
            raise ValueError(f"Incomplete spoken transcript: {beat['id']}")
        if " ".join(part["caption"] for part in parts) != beat["caption"]:
            raise ValueError(f"Incomplete Roman transcript: {beat['id']}")
        audio = directory / "audio" / f"{beat['id']}.wav"
        audio_hash = digest(audio.read_bytes())
        text_hash = digest(json.dumps(
            [[part["speech"], part["caption"]] for part in parts],
            ensure_ascii=False, separators=(",", ":"),
        ).encode())
        previous = existing["beats"].get(beat["id"])
        if (existing.get("engine") == result["engine"] and previous
                and previous["audioHash"] == audio_hash and previous["textHash"] == text_hash):
            result["beats"][beat["id"]] = previous
            print(f"Reused aligned captions: {beat['id']}", flush=True)
            continue
        if model is None:
            model = stable_whisper.load_model("base", device="cpu", download_root=str(root / ".models/whisper"))
        aligned = model.align(
            str(audio), "\n".join(part["speech"] for part in parts),
            language="hi", original_split=True, verbose=None, regroup=False,
        )
        if aligned is None or len(aligned.segments) != len(parts):
            raise ValueError(f"Alignment did not preserve all caption groups: {beat['id']}")
        duration = sf.info(audio).duration
        cues = []
        last_end = 0.0
        for segment, part in zip(aligned.segments, parts):
            start = max(0.0, segment.start)
            end = min(duration, segment.end)
            if not math.isfinite(start + end) or end <= start or start < last_end - 0.05:
                raise ValueError(f"Invalid or overlapping alignment: {beat['id']}")
            cues.append({"start": round(start, 3), "end": round(end, 3), "text": part["caption"]})
            last_end = end
        result["beats"][beat["id"]] = {"audioHash": audio_hash, "textHash": text_hash, "cues": cues}
        print(f"Aligned {beat['id']}: {len(cues)} captions, {duration:.2f}s", flush=True)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(destination)


if __name__ == "__main__":
    main()
