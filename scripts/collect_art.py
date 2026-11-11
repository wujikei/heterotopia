"""Collect only this project's submitted ComfyUI jobs into portable assets."""
from __future__ import annotations

import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "art"
ART.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:8188"


def collect(job: dict) -> bool:
    key = job["key"]
    dest = ART / (key + ".webp")
    if dest.exists():
        return True
    prompt_id = job.get("prompt_id")
    if not prompt_id:
        return False
    with urllib.request.urlopen(BASE + "/history/" + prompt_id, timeout=10) as response:
        record = json.load(response).get(prompt_id)
    if not record:
        return False
    if record.get("status", {}).get("status_str") == "error":
        print("FAILED", key, record.get("status"), flush=True)
        return False
    images = [image for output in record.get("outputs", {}).values() for image in output.get("images", [])]
    if not images:
        return False
    result = images[0]
    query = urllib.parse.urlencode({"filename": result["filename"], "subfolder": result.get("subfolder", ""), "type": result.get("type", "output")})
    with urllib.request.urlopen(BASE + "/view?" + query, timeout=20) as response:
        data = response.read()
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if key.startswith("portrait-"):
        # Qwen renders these against an explicitly requested green screen.
        # Keep all opaque clothing/skin and feather only green screen edges.
        rgba = im.convert("RGBA")
        pixels = []
        for r, g, b in im.getdata():
            dominance = g - max(r, b)
            if g > 65 and dominance > 18:
                alpha = max(0, min(255, round(255 * (1 - (dominance - 18) / 45))))
                g = min(g, max(r, b) + 10)
            else:
                alpha = 255
            pixels.append((r, g, b, alpha))
        rgba.putdata(pixels)
        im = rgba
    im.save(dest, "WEBP", quality=91, method=6)
    thumb = ImageOps.fit(im, (480, 280), method=Image.Resampling.LANCZOS)
    thumb.save(ART / (key + "-thumb.webp"), "WEBP", quality=82)
    print(f"SAVED {key}: {im.width}x{im.height}, {dest.stat().st_size // 1024} KB", flush=True)
    return True


def derived() -> None:
    source = ART / "classroom.webp"
    dest = ART / "classroom-day.webp"
    if source.exists() and not dest.exists():
        im = Image.open(source).convert("RGB")
        im = ImageEnhance.Brightness(im).enhance(1.26)
        im = ImageEnhance.Color(im).enhance(0.82)
        warm = Image.new("RGB", im.size, (228, 196, 150))
        im = Image.blend(im, warm, 0.10)
        im.save(dest, "WEBP", quality=91)
        ImageOps.fit(im, (480, 280)).save(ART / "classroom-day-thumb.webp", "WEBP", quality=82)


def main() -> None:
    hero = ART / "hero.png"
    if hero.exists() and not (ART / "hero.webp").exists():
        im = Image.open(hero).convert("RGB")
        im.save(ART / "hero.webp", "WEBP", quality=94, method=6)
        ImageOps.fit(im, (480, 280)).save(ART / "hero-thumb.webp", "WEBP", quality=85)
    deadline = time.monotonic() + 3600
    while time.monotonic() < deadline:
        jobs = json.loads((ROOT / "art-prompts.json").read_text(encoding="utf-8"))["jobs"]
        done = 0
        for job in jobs:
            try:
                done += collect(job)
            except Exception as exc:
                print(f"Pending {job['key']}: {exc}", flush=True)
        derived()
        if done == len(jobs):
            print(f"All {done} assets collected.", flush=True)
            return
        time.sleep(12)
    raise SystemExit("Some image jobs still pending; run this collector again.")


if __name__ == "__main__":
    main()
