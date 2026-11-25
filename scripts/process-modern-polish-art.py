"""Export the reviewed overseas art and its mobile layout from retained sources."""
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'resources/art-src/modern-polish'
FONT = ROOT / 'resources/fonts/NotoSerifSC-Variable.ttf'
ART = ROOT / 'public/art'
ORIGINALS = ROOT / 'public/art-original'
MANIFEST = ROOT / 'src/data/art-manifest.json'


def jade_letters(image):
    """Paint dark incisions and a thin lit lip on the existing jade faces."""
    for character, center in [('曰', (693, 689)), ('何', (781, 694)), ('初', (681, 738)), ('归', (765, 743))]:
        mask = Image.new('L', (80, 80))
        draw = ImageDraw.Draw(mask)
        draw.text((40, 40), character, font=ImageFont.truetype(str(FONT), 58), anchor='mm', fill=255)
        mask = mask.resize((20, 13), Image.Resampling.LANCZOS).rotate(-6, resample=Image.Resampling.BICUBIC)
        x, y = center[0] - mask.width // 2, center[1] - mask.height // 2
        image.paste((233, 234, 198), (x, y + 1, x + mask.width, y + 1 + mask.height), mask.point(lambda a: a * 0.59))
        image.paste((68, 85, 65), (x, y, x + mask.width, y + mask.height), mask.point(lambda a: a * 0.82))
    return image


def street_sign(image):
    overlay = Image.new('RGBA', image.size)
    draw = ImageDraw.Draw(overlay)
    draw.text((314, 130), '奶', font=ImageFont.truetype(str(FONT), 33), fill=(70, 58, 45, 193), anchor='mm')
    draw.text((314, 177), '茶', font=ImageFont.truetype(str(FONT), 33), fill=(70, 58, 45, 193), anchor='mm')
    draw.text((313, 227), 'TEA', font=ImageFont.truetype(str(FONT), 18), fill=(70, 58, 45, 167), anchor='mm')
    return Image.alpha_composite(image.convert('RGBA'), overlay.filter(ImageFilter.GaussianBlur(0.55))).convert('RGB')


def jade_study():
    # Keep the fingers and the original carved character for scale.
    master = ROOT / 'resources/art-src/modern-r2/cg-modern-jade-palm-r2.png'
    image = Image.open(master).convert('RGBA').crop((402, 160, 899, 657))
    feather = Image.new('L', image.size)
    ImageDraw.Draw(feather).ellipse((51, 48, 445, 443), fill=255)
    image.putalpha(feather.filter(ImageFilter.GaussianBlur(24)))
    return image.resize((640, 640), Image.Resampling.LANCZOS)


def write_image(image, path, quality=92):
    if path.suffix == '.avif':
        image.save(path, quality=quality, speed=6, max_threads=2)
    else:
        image.save(path, quality=quality, method=6)


def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    generated = MASTERS / 'generated'
    exports = {
        'modern-street-arrival-r3': (street_sign(Image.open(generated / 'street-b.png').convert('RGB')), None),
        'cg-modern-word-stall-r3': (jade_letters(Image.open(generated / 'word-stall-a.png').convert('RGB')), (294, 26, 1260, 809)),
        'modern-royal-wall-night': (Image.open(generated / 'royal-wall-night-b.png').convert('RGB'), None),
    }
    added_avif = set()
    for name, (image, crop) in exports.items():
        master = MASTERS / f'{name}.png'
        image.save(master)
        manifest['masters'][name] = master.relative_to(ROOT).as_posix()
        formats = {name: image, f'{name}-thumb': image.resize((480, 270), Image.Resampling.LANCZOS)}
        if crop:
            formats[f'{name}-m'] = image.crop(crop)
            manifest['mobile'] = sorted(set(manifest['mobile']) | {name})
            manifest['mobileOriginals'][name] = f'{name}-m.webp'
        for key, variant in formats.items():
            thumb = key.endswith('-thumb')
            write_image(variant, ART / f'{key}.webp', 84 if thumb else 92)
            write_image(variant, ART / f'{key}.avif', 56 if thumb else 65)
            added_avif.add(key)
            if not thumb:
                variant.save(ORIGINALS / f'{key}.webp', lossless=True, method=6)
                manifest['originals'][key] = f'{key}.webp'
    stone = jade_study()
    stone.save(MASTERS / 'prop-question-jade.png')
    write_image(stone, ART / 'prop-question-jade.webp')
    write_image(stone, ART / 'prop-question-jade.avif', 68)
    added_avif.add('prop-question-jade')
    manifest['masters']['prop-question-jade'] = (MASTERS / 'prop-question-jade.png').relative_to(ROOT).as_posix()
    manifest['avif'] = sorted(set(manifest['avif']) | added_avif)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    for item in sorted(MASTERS.rglob('*.png')):
        print(item.relative_to(ROOT).as_posix(), sha256(item.read_bytes()).hexdigest())


if __name__ == '__main__':
    main()
