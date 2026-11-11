"""Compile the user's V6 screenplay into lossless scene/beat data.

Directions remain metadata, never executable instructions. Narrative paragraphs
are kept verbatim, with display-only splits at punctuation for readable pages.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "异托邦 V6 完整剧本.txt"
SCENE = re.compile(r"^((?:[01]-\d+)|(?:A-(?:\d+[a-z]?|E[123]-\d+|H-\d+))|(?:B-\d+(?:-\d+)?)|(?:终-\d+))\s+(.+)$")
TAG = re.compile(r"^【([^】]+)】(.*)$")
CHAPTER = re.compile(r"^(?:序章 |共通线 |王裔线 |昆仑线 |光河与归来$)")
DIRECTIONS = {"背景", "音效", "立绘", "演出", "路线提示", "记录", "分支结束", "路线结束"}

BACKGROUND = {
    "0-1": "bedroom", "0-2": "home", "0-3": "bus", "0-4": "classroom-day",
    "0-5": "school", "0-6": "alley", "0-7": "shrine", "0-8": "classroom-day",
    "0-9": "school", "0-10": "classroom", "0-11": "nightmare",
    "1-1": "hut", "1-2": "hut", "1-3": "village", "1-4": "shrine",
    "1-5": "hut", "1-6": "hut", "1-7": "ritual", "1-8": "bamboo",
    "1-9": "hut", "1-10": "village", "1-11": "hut", "1-12": "hut",
    "A-1": "village", "A-2": "study", "A-3": "study", "A-4": "palace",
    "A-5": "study", "A-6": "tomb", "A-6a": "study", "A-7": "ritual",
    "A-8": "ritual", "A-9": "ritual", "A-E1-1": "ritual", "A-E1-2": "alley",
    "A-E2-1": "ritual", "A-E2-2": "tomb", "A-E2-3": "river", "A-E2-4": "ruins",
    "A-E3-1": "alley", "A-E3-2": "palace", "A-E3-3": "river", "A-H-1": "light-river",
    "B-1": "river", "B-2": "river", "B-3-1": "marsh", "B-3-2": "marsh", "B-3-3": "marsh",
    "B-4": "ruins", "B-5-1": "village", "B-5-2": "village", "B-5-3": "hut",
    "B-5-4": "village", "B-5-5": "hut", "B-5-6": "mountain", "B-6": "river",
    "B-7-1": "shrine", "B-7-2": "shrine", "B-7-3": "river", "B-7-4": "underwater",
    "B-7-5": "shrine", "B-8": "bamboo", "B-9-1": "valley", "B-9-2": "valley",
    "B-9-3": "valley", "B-9-4": "valley", "B-9-5": "valley", "B-9-6": "hut",
    "B-10-1": "cave", "B-10-2": "cave", "B-10-3": "cave", "B-10-4": "cave",
    "B-11": "mountain", "B-12-1": "snow", "B-12-2": "snow", "B-13": "light-river",
    "终-1": "light-river", "终-2": "classroom", "终-3": "classroom", "终-4": "alley", "终-5": "home",
}


def pages(text: str, limit: int = 145) -> list[str]:
    """Split without dropping or inserting a single source character."""
    if len(text) <= limit:
        return [text]
    sentences = re.findall(r".*?[。！？；](?:[”’」』]+)?|.+$", text)
    result: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current + sentence) > limit:
            result.append(current)
            current = ""
        current += sentence
    if current:
        result.append(current)
    assert "".join(result) == text
    return result


def import_story() -> None:
    raw = SOURCE.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    start = raw.index("\n序章 水声之前\n0-1 ") + 1
    lines = raw[start:].splitlines()
    scenes: list[dict] = []
    scene: dict | None = None
    chapter = ""
    block: dict | None = None

    def flush() -> None:
        nonlocal block
        if block and scene is not None:
            scene["blocks"].append(block)
        block = None

    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = SCENE.match(line)
        if match:
            flush()
            scene_id, title = match.groups()
            scene = {"id": scene_id, "title": title, "chapter": chapter,
                     "route": "prologue" if scene_id.startswith("0-") else "common" if scene_id.startswith("1-") else "royal" if scene_id.startswith("A-") else "kunlun" if scene_id.startswith("B-") else "return",
                     "background": BACKGROUND[scene_id], "blocks": []}
            scenes.append(scene)
            continue
        if CHAPTER.match(line):
            flush()
            chapter = line
            continue
        match = TAG.match(line)
        if match:
            flush()
            tag, inline = match.groups()
            block = {"tag": tag, "lines": [inline] if inline else []}
        elif block is not None:
            block["lines"].append(line)
        else:
            raise ValueError(f"Unassigned source line: {line}")
    flush()

    narrative_count = 0
    character_count = 0
    for scene in scenes:
        for block in scene["blocks"]:
            tag = block["tag"]
            is_direction = tag.split("·")[0] in DIRECTIONS
            if not is_direction and not tag.startswith("若") and tag not in {"共同剧情", "选择"}:
                original = block["lines"]
                block["pages"] = [page for line in original for page in pages(line)]
                narrative_count += len(block["pages"])
                character_count += sum(map(len, original))
    assert len(scenes) == 81, f"Expected 81 scenes, got {len(scenes)}"
    data = {"title": "异托邦", "edition": "V6", "sceneCount": len(scenes),
            "pageCount": narrative_count, "characterCount": character_count,
            "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "scenes": scenes}
    dest = ROOT / "src" / "data" / "story.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    source_copy = ROOT / "public" / "原著剧本-V6.txt"
    source_copy.write_bytes(SOURCE.read_bytes())
    print(f"Imported {len(scenes)} scenes, {narrative_count} pages, {character_count:,} narrative characters.")
    print(f"Source SHA-256: {data['sourceSha256']}")
    print(f"Saved: {dest}")


if __name__ == "__main__":
    import_story()
