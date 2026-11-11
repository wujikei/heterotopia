"""Master the local ACE-Step score and build the project's original sound palette.

Requires Python + numpy and FFmpeg on PATH. No network or inference is performed.
Lossless ACE masters belong in artifacts/audio-masters, outside the shipped game.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
import subprocess
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "artifacts" / "audio-masters"
WORK = ROOT / "artifacts" / "audio-production"
DEST = ROOT / "public" / "audio"
SR = 44100
RNG = np.random.default_rng(6111126)
REPORT: list[dict] = []


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=True, capture_output=True)


def timeline(seconds: float) -> np.ndarray:
    return np.arange(round(seconds * SR), dtype=np.float64) / SR


def noise(seconds: float, low=30.0, high=10000.0) -> np.ndarray:
    """Band-shaped, periodic noise; an FFT avoids platform DSP dependencies."""
    n = round(seconds * SR)
    spectrum = np.fft.rfft(RNG.normal(size=n))
    freq = np.fft.rfftfreq(n, 1 / SR)
    shape = 1 / np.sqrt(1 + (freq / high) ** 8)
    shape *= 1 - 1 / np.sqrt(1 + (freq / max(low, 1)) ** 8)
    spectrum *= shape
    result = np.fft.irfft(spectrum, n=n)
    return result / max(np.sqrt(np.mean(result * result)), 1e-9)


def envelope(t: np.ndarray, attack=.015, release=.2) -> np.ndarray:
    return (1 - np.exp(-t / attack)) * np.exp(-t / release)


def place(target: np.ndarray, source: np.ndarray, at: float, gain=1.0) -> None:
    start = round(at * SR)
    if start >= len(target):
        return
    count = min(len(source), len(target) - start)
    target[start:start + count] += source[:count] * gain


def periodic_place(target: np.ndarray, source: np.ndarray, at: float, gain=1.0) -> None:
    start = round(at * SR) % len(target)
    indices = (np.arange(len(source)) + start) % len(target)
    np.add.at(target, indices, source * gain)


def resonator(seconds: float, frequencies: list[float], decays: list[float],
              levels: list[float] | None = None, attack=.0015) -> np.ndarray:
    t = timeline(seconds)
    result = np.zeros_like(t)
    for f, decay, level in zip(frequencies, decays, levels or [1] * len(frequencies)):
        result += level * np.sin(2 * np.pi * f * t) * envelope(t, attack, decay)
    return result


def bronze(seconds=5.8, fundamental=369.99) -> np.ndarray:
    return resonator(seconds,
                     [fundamental * r for r in [1, 1.006, 2.71, 3.89, 5.43, 6.79]],
                     [1.65, 1.45, 1.05, .76, .44, .31],
                     [.65, .3, .21, .1, .035, .012], attack=.003)


def wood(seconds=.6) -> np.ndarray:
    t = timeline(seconds)
    return (resonator(seconds, [192, 541, 1120, 1780], [.07, .045, .024, .018], [.5, .3, .18, .08])
            + noise(seconds, 180, 4200) * envelope(t, .001, .018) * .12)


def splash(seconds=2.3) -> np.ndarray:
    t = timeline(seconds)
    body = noise(seconds, 170, 2300) * envelope(t, .035, .35)
    spray = noise(seconds, 1600, 10000) * envelope(t, .018, .14) * .24
    return body + spray


def drop(seconds=.65) -> np.ndarray:
    t = timeline(seconds)
    phase = 2 * np.pi * (470 * t + 150 * (1 - np.exp(-t * 23)))
    return np.sin(phase) * envelope(t, .002, .055)


def spatial(mono: np.ndarray, wet=.12, width=.3, loop=False) -> np.ndarray:
    # Dry center plus quiet, asymmetric early reflections; no hard headphone pans.
    result = np.column_stack([mono.copy(), mono.copy()])
    for i, (delay, amount) in enumerate([(.017, .5), (.043, .35), (.079, .25), (.131, .15), (.223, .08)]):
        samples = round(delay * SR)
        if loop:
            reflection = np.roll(mono, samples)
        else:
            reflection = np.zeros_like(mono)
            reflection[samples:] = mono[:-samples]
        result[:, i % 2] += reflection * wet * amount * (1 + width)
        result[:, 1 - i % 2] += reflection * wet * amount * (1 - width)
    return result


def write_wave(path: Path, samples: np.ndarray) -> None:
    if samples.ndim == 1:
        samples = spatial(samples)
    samples = np.nan_to_num(samples)
    peak = np.max(np.abs(samples))
    if peak > .96:
        samples = samples * .96 / peak
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(np.round(samples * 32767).astype("<i2").tobytes())


def loudness(path: Path, target: float, peak: float, lra=10) -> dict:
    result = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
                  f"loudnorm=I={target}:TP={peak}:LRA={lra}:print_format=json", "-f", "null", "-"])
    log = result.stderr.decode("utf-8", errors="replace")
    return json.loads(log[log.rfind("{"):log.rfind("}") + 1])


def encode(path: Path, filename: str, title: str, kind: str, loop=False, target=-18.0,
           peak=-2.0, duration: float | None = None) -> dict:
    destination = DEST / filename
    if kind == "effect":
        # Every source effect has a 0.28 sample peak; short clicks cannot be
        # measured meaningfully with R128's 400 ms integration window.
        filt = "volume=2dB"
    else:
        measured = loudness(path, target, peak, 10 if kind == "music" else 7)
        if not math.isfinite(float(measured["input_i"])):
            raise ValueError(f"Silent audio: {filename}")
        filt = (f"loudnorm=I={target}:TP={peak}:LRA={10 if kind == 'music' else 7}:"
                f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
                f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
                f"offset={measured['target_offset']}:linear=true")
    bitrate = "192k" if kind == "music" else "128k" if kind == "ambience" else "160k"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-af", filt, "-ar", str(SR), "-ac", "2", "-c:a", "libmp3lame", "-b:a", bitrate,
         "-metadata", f"title={title}", "-metadata", "album=异托邦 · 循水归来",
         "-metadata", "artist=异托邦", "-metadata", f"comment={'Local ACE-Step 1.5 instrumental score' if kind == 'music' else 'Original procedural sound design; scripts/produce_audio.py'}",
         str(destination)])
    checked = loudness(destination, target, peak)
    info = {
        "file": filename, "title": title, "kind": kind, "loop": loop,
        "seconds": round(duration or 0, 5), "bytes": destination.stat().st_size,
        "integratedLUFS": float(checked["input_i"]) if math.isfinite(float(checked["input_i"])) else None,
        "truePeakDB": float(checked["input_tp"]),
        "source": "Local ACE-Step 1.5" if kind == "music" else "Original deterministic procedural sound design",
    }
    # Encoding may introduce a small inter-sample overshoot; leave a full dB of margin.
    if info["truePeakDB"] > -1:
        raise ValueError(f"Insufficient peak headroom: {info}")
    REPORT.append(info)
    level = f"{info['integratedLUFS']:6.1f} LUFS" if info['integratedLUFS'] is not None else "short click"
    print(f"{kind:8} {filename:30} {level}  {info['bytes'] / 1024:7.0f} KiB", flush=True)
    return info


def music_score(plan: dict) -> None:
    catalog = []
    for track in plan["tracks"]:
        master = MASTERS / f"{track['id']}.flac"
        data = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(master),
                    "-f", "f32le", "-ar", str(SR), "-ac", "2", "-"]).stdout
        audio = np.frombuffer(data, dtype="<f4").reshape(-1, 2).astype(np.float64)
        if len(audio) < SR * 30:
            raise ValueError(f"Incomplete master: {master}")
        # Circular one-bar overlap, with the new loop point in uninterrupted audio.
        overlap = round(4 * 60 / track["bpm"] * SR)
        theta = np.linspace(0, np.pi / 2, overlap, endpoint=False)[:, None]
        blend = audio[-overlap:] * np.cos(theta) + audio[:overlap] * np.sin(theta)
        looped = np.concatenate([audio[overlap:-overlap], blend])
        intermediate = WORK / f"{track['id']}-loop.wav"
        write_wave(intermediate, looped)
        duration = len(looped) / SR
        info = encode(intermediate, f"music-{track['id']}.mp3", track["title"], "music", True, duration=duration)
        catalog.append({k: track[k] for k in ["id", "title", "subtitle", "bpm", "keyscale"]} |
                       {"file": info["file"], "seconds": round(duration, 5)})
    (ROOT / "src" / "data" / "soundtrack.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def effect_palette() -> dict[str, tuple[str, np.ndarray]]:
    effects = {}
    def add(key, title, signal, wet=.13):
        signal = spatial(signal, wet=wet)
        # Short, smooth endpoints avoid clicks after MP3 decoding.
        fade = min(round(.012 * SR), len(signal) // 4)
        signal[:fade] *= np.linspace(0, 1, fade)[:, None]
        signal[-fade:] *= np.linspace(1, 0, fade)[:, None]
        signal *= .28 / max(np.max(np.abs(signal)), 1e-9)
        effects[key] = (title, signal)

    t = timeline(.24)
    paper = noise(.24, 1100, 10000) * (np.sin(np.pi * np.minimum(t / .21, 1)) ** 3) * (.6 + .4 * np.sin(t * 80) ** 2)
    add("page", "纸页轻翻", paper, .04)
    add("choice", "木与玉", wood(.38) * .8 + resonator(.38, [1750, 2670], [.045, .022], [.05, .02]), .06)
    add("bookmark", "一枚书签", bronze(1.8, 587.33) * .5, .15)
    add("bronze", "铜铃一声", bronze(), .25)
    triple = np.zeros(round(8.5 * SR))
    for at, gain in [(0, .7), (1.5, .83), (3.2, 1)]:
        place(triple, bronze(5.3), at, gain)
    add("triple-bell", "铜铃三响", triple, .3)
    t = timeline(1.5)
    drum = np.sin(2 * np.pi * (68 * t + 3 * (1 - np.exp(-t * 22)))) * envelope(t, .003, .22)
    drum += noise(1.5, 50, 1500) * envelope(t, .002, .035) * .13
    drums = np.zeros(round(5.3 * SR))
    for at, gain in [(0, .65), (1.9, .75), (3.4, 1)]:
        place(drums, drum, at, gain)
    add("ritual-drum", "祭鼓渐近", drums, .3)
    under = np.zeros(round(3.8 * SR))
    for at, gain in [(0, .4), (1.1, .62), (2.35, .9)]:
        place(under, wood(1.0) + drum[:SR] * .35, at, gain)
    add("hull", "船底三叩", under, .35)
    t = timeline(2.5)
    pulse = np.clip(np.sin(2 * np.pi * 3.2 * t), 0, 1) ** .4
    alarm = (np.sin(2 * np.pi * 830 * t) + .18 * np.sin(2 * np.pi * 1660 * t)) * pulse
    alarm *= (1 - np.exp(-t * 35)) * np.minimum(1, (2.5 - t) / .15)
    add("alarm", "清晨闹钟", alarm, .035)
    add("school-bell", "放学铃", resonator(3.1, [740, 1489, 2102, 3580], [.9, .5, .28, .12], [1, .25, .1, .035]), .22)
    door = np.zeros(round(1.5 * SR))
    for at in [0, .32]:
        place(door, wood(.9), at)
    add("door", "两下叩门", door, .18)
    add("wood-latch", "门闩轻落", wood(.8) + np.roll(wood(.8) * .6, round(.13 * SR)), .18)
    slips = np.zeros(round(1.5 * SR))
    for at in [0, .065, .19, .34, .51, .76]:
        place(slips, wood(.5), at, .2 + RNG.random() * .4)
    add("bamboo", "竹简与旧木", slips, .12)
    t = timeline(1.1)
    add("cloth", "衣料轻擦", noise(1.1, 500, 6000) * np.sin(np.pi * t / 1.1) ** 3 * (.55 + .45 * np.sin(t * 21) ** 2), .04)
    add("ceramic", "陶碗轻碰", resonator(1.6, [681, 1279, 2351, 3660], [.17, .12, .07, .04], [1, .32, .2, .07]), .16)
    add("splash", "破水", splash(), .15)
    t = timeline(2.6)
    oar = noise(2.6, 120, 1600) * envelope(t, .12, .53) * .55
    for at in [.32, .55, .68, 1.04]:
        place(oar, drop(), at, .08)
    add("oar", "船橹入水", oar, .1)
    add("drop", "水滴入深处", drop(1.7), .45)
    t = timeline(3.7)
    flicker = noise(3.7, 1800, 9000) * .25 + np.sin(2 * np.pi * 100 * t) * .12
    flicker *= np.sin(np.pi * t / 3.7) ** 1.6 * (.15 + .85 * np.sin(t * 41 + np.sin(t * 19) * 2) ** 8)
    add("electric", "灯管与电流", flicker, .2)
    t = timeline(1.3)
    scrape = noise(1.3, 400, 3700) * np.sin(np.pi * t / 1.3) ** 2
    scrape += np.sin(2 * np.pi * (270 * t + 110 * t * t)) * .15 * np.sin(np.pi * t / 1.3) ** 3
    add("chair", "椅脚掠地", scrape, .16)
    steps = np.zeros(round(2.8 * SR))
    for at, gain in [(0, .8), (.63, .72), (1.31, .58)]:
        place(steps, wood(.5) + noise(.5, 110, 2500) * envelope(timeline(.5), .012, .065) * .3, at, gain)
    add("steps", "远近脚步", steps, .3)
    t = timeline(4.6)
    stone = noise(4.6, 70, 1900) * (.35 + .65 * np.sin(t * 14) ** 2)
    stone += np.sin(2 * np.pi * 73 * t) * .2
    stone *= np.sin(np.pi * t / 4.6) ** 2
    add("stone", "石门缓移", stone, .4)
    t = timeline(1.8)
    string = resonator(1.8, [196, 393, 799, 1173, 1762], [.18, .13, .1, .07, .04], [.8, .45, .25, .12, .08])
    string += noise(1.8, 1200, 8000) * envelope(t, .001, .016) * .25
    add("string-snap", "绷弦轻裂", string, .25)
    ball = np.zeros(round(1.7 * SR))
    bounce = resonator(.6, [96, 171, 281], [.06, .05, .026], [1, .5, .12]) + noise(.6, 100, 3000) * envelope(timeline(.6), .001, .018) * .15
    place(ball, bounce, 0)
    place(ball, bounce, .64, .55)
    add("ball", "篮球弹地", ball, .2)
    add("bike-bell", "归路车铃", resonator(2.3, [1830, 2943, 4122], [.55, .4, .2], [.7, .4, .1], .002), .2)
    flute = np.zeros(round(4.8 * SR))
    for at, length, pitch, strength in [(0, .58, 440, .7), (.95, 1.0, 392, .9), (2.6, 1.6, 293.66, .45)]:
        t = timeline(length)
        phase = 2 * np.pi * pitch * t + .1 * np.sin(2 * np.pi * 4.6 * t)
        breath = noise(length, 1400, 6500) * .11
        note = (np.sin(phase) + .1 * np.sin(2 * phase) + breath) * np.sin(np.pi * t / length) ** 1.8
        place(flute, note, at, strength)
    add("flute", "断笛未尽", flute, .24)
    t = timeline(1.3)
    crow = (np.sin(2 * np.pi * (490 * t - 70 * t * t)) + .33 * np.sin(2 * np.pi * 1431 * t))
    crow = np.tanh(crow * 2) * envelope(t, .03, .12) * (np.sin(t * 19) ** 2)
    crow += noise(1.3, 650, 2800) * envelope(t, .025, .1) * .6
    add("crow", "远鸦", crow, .38)
    pottery = np.zeros(round(4.5 * SR))
    for at, gain in [(0, .6), (1.25, .8), (2.9, .5)]:
        place(pottery, resonator(1.2, [238, 573, 921], [.11, .07, .05], [1, .3, .14]), at, gain)
    add("pottery", "陶缸里的轻叩", pottery, .4)
    heartbeat = np.zeros(round(3.3 * SR))
    thud = resonator(.5, [49, 83], [.07, .04], [1, .3], .008)
    for at in [0, 1.05, 2.12]:
        place(heartbeat, thud, at)
        place(heartbeat, thud, at + .18, .5)
    add("heartbeat", "近处心跳", heartbeat, .08)
    return effects


def ambient_palette() -> dict[str, tuple[str, np.ndarray]]:
    seconds = 24
    t = timeline(seconds)
    slow = .73 + .16 * np.sin(2 * np.pi * t / seconds + 1.3) + .1 * np.sin(2 * np.pi * t * 5 / seconds)
    river = noise(seconds, 90, 1600) * .5 * slow + noise(seconds, 1400, 5800) * .1
    for at in RNG.uniform(0, seconds, 27):
        periodic_place(river, drop(), at, .025)
    rain = noise(seconds, 300, 9000) * (.85 + .08 * np.sin(2 * np.pi * t * 2 / seconds))
    rain += noise(seconds, 200, 1200) * .3
    for at in RNG.uniform(0, seconds, 75):
        periodic_place(rain, noise(.055, 1200, 9000) * envelope(timeline(.055), .001, .009), at, .2)
    fire = noise(seconds, 70, 750) * .17 * slow + noise(seconds, 800, 5500) * .04
    for at in RNG.uniform(0, seconds, 47):
        grain = noise(.1, 900, 8000) * envelope(timeline(.1), .001, RNG.uniform(.005, .022))
        periodic_place(fire, grain, at, RNG.uniform(.05, .23))
    wind = noise(seconds, 25, 650) * slow + noise(seconds, 1100, 3000) * (.05 + .035 * np.sin(2 * np.pi * t * 3 / seconds))
    winter = noise(seconds, 30, 450) * slow + noise(seconds, 1800, 6200) * .07 * slow
    room = noise(seconds, 90, 540) * .2 + noise(seconds, 700, 1800) * .02
    room += (.05 * np.sin(2 * np.pi * 100 * t) + .018 * np.sin(2 * np.pi * 200 * t)) * (.9 + .1 * np.sin(2 * np.pi * t * 12 / seconds))
    night = noise(seconds, 120, 1600) * .05
    for f, cycles, phase in [(3170, 5, .4), (3790, 7, 2.1), (4260, 3, 1.3)]:
        insect = np.maximum(0, np.sin(2 * np.pi * t * cycles / seconds + phase)) ** 8
        insect *= np.maximum(0, np.sin(2 * np.pi * t * 144 / seconds)) ** 3
        night += np.sin(2 * np.pi * f * t) * insect * .028
    street = noise(seconds, 70, 1000) * .18 + noise(seconds, 1000, 3900) * .015
    for at in [2.4, 11.8, 19.1]:
        length = 4.2
        vehicle = noise(length, 55, 650) * np.sin(np.pi * timeline(length) / length) ** 3
        periodic_place(street, vehicle, at, .3)
    marsh = river * .4 + night * .3
    for at in RNG.uniform(0, seconds, 15):
        periodic_place(marsh, drop(.4), at, .11)
    underwater = noise(seconds, 25, 420) * .6 * slow + noise(seconds, 400, 1100) * .08
    for at in RNG.uniform(0, seconds, 12):
        periodic_place(underwater, drop(.55), at, .025)
    cave = noise(seconds, 40, 300) * .12
    for at in [1.2, 4.7, 10.4, 16.3, 21.8]:
        periodic_place(cave, drop(2), at, .06)
        periodic_place(cave, drop(2), at + .31, .018)
        periodic_place(cave, drop(2), at + .73, .006)
    palace = noise(seconds, 80, 500) * .12 * slow + noise(seconds, 1200, 4000) * .008
    palettes = {
        "river": ("河水与微澜", river), "rain": ("檐上夜雨", rain),
        "hearth": ("灶火未熄", fire), "wind": ("山风穿林", wind),
        "winter": ("风雪渐细", winter), "room": ("教室电扇", room),
        "night": ("竹林夜虫", night), "street": ("小城远街", street),
        "marsh": ("泽中暗水", marsh), "underwater": ("水下深处", underwater),
        "cave": ("旧洞滴水", cave), "palace": ("长廊空响", palace),
    }
    result = {}
    for key, (title, mono) in palettes.items():
        stereo = spatial(mono, wet=.35, width=.65, loop=True)
        # Independent, quiet diffuse side component; all oscillations are periodic.
        side = noise(seconds, 300, 3800) * np.std(mono) * .08
        stereo[:, 0] += side
        stereo[:, 1] -= side
        result[key] = (title, stereo * .15 / max(np.std(stereo), 1e-9))
    return result


def main():
    for folder in [WORK, DEST]:
        folder.mkdir(parents=True, exist_ok=True)
    plan = json.loads((ROOT / "audio-prompts.json").read_text(encoding="utf-8"))
    music_score(plan)
    for key, (title, audio) in ambient_palette().items():
        path = WORK / f"amb-{key}.wav"
        write_wave(path, audio)
        encode(path, f"amb-{key}.mp3", title, "ambience", True, -26, -6, len(audio) / SR)
    for key, (title, audio) in effect_palette().items():
        path = WORK / f"sfx-{key}.wav"
        write_wave(path, audio)
        # Normalization is peak constrained for short transients, with a quiet target.
        encode(path, f"sfx-{key}.mp3", title, "effect", False, -24, -7, len(audio) / SR)
    manifest = {"version": 1, "sampleRate": SR, "musicMastering": "One-bar circular equal-power overlap; two-pass EBU R128 -18 LUFS / -2 dBTP", "files": REPORT}
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    plan["effects"] = [{"id": f["file"].removesuffix(".mp3"), "title": f["title"], "source": f["source"]} for f in REPORT if f["kind"] != "music"]
    (ROOT / "audio-prompts.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Finished: {len(REPORT)} assets, {sum(a['bytes'] for a in REPORT) / 1024 / 1024:.1f} MiB", flush=True)


if __name__ == "__main__":
    main()
