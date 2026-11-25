"""Set the legible ink for the overseas notebook and manuscript illustrations."""
from io import BytesIO
import json
from pathlib import Path

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'resources/art-src/modern-text'
ART = ROOT / 'public/art'
ORIGINALS = ROOT / 'public/art-original'
MANIFEST = ROOT / 'src/data/art-manifest.json'
SERIF = ROOT / 'resources/fonts/NotoSerifSC-Variable.ttf'


def hand_font(size):
    font = TTFont(ROOT / 'public/fonts/story-hand-regular.woff2')
    font.flavor = None
    buffer = BytesIO()
    font.save(buffer)
    buffer.seek(0)
    return ImageFont.truetype(buffer, size)


def lay_ink(image, paper, corners):
    """Project the ink onto the photographed corners of the paper."""
    width, height = paper.size
    plane = [(0, 0), (width, 0), (width, height), (0, height)]
    matrix = []
    for (x, y), (u, v) in zip(corners, plane):
        matrix.extend(([x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]))
    coeffs = np.linalg.solve(matrix, np.array(plane).flatten())
    ink = paper.transform(image.size, Image.Transform.PERSPECTIVE, coeffs, Image.Resampling.BICUBIC)
    return Image.alpha_composite(image, ink.filter(ImageFilter.GaussianBlur(.4)))


def notebook():
    image = Image.open(MASTERS / 'library-comfy-source.png').convert('RGBA')
    source = Image.new('RGBA', (540, 610))
    pen = ImageDraw.Draw(source)
    pen.text((25, 12), '天问', font=ImageFont.truetype(SERIF, 36), fill=(55, 50, 41, 168))
    font = ImageFont.truetype(SERIF, 40)
    for i, line in enumerate(('曰遂古之初，谁传道之？', '上下未形，何由考之？', '冥昭瞢暗，谁能极之？', '冯翼惟象，何以识之？')):
        pen.text((25 + (i % 2) * 3, 98 + i * 95), line, font=font,
                 fill=(55, 50, 41, 207 if i == 1 else 165))
    image = lay_ink(image, source, ((209, 177), (681, 135), (784, 697), (245, 762)))

    answer = Image.new('RGBA', (490, 240))
    pen = ImageDraw.Draw(answer)
    pen.text((56, 92), '不译。', font=hand_font(94), fill=(38, 42, 39, 247))
    marked = lay_ink(image, answer, ((749, 155), (1210, 116), (1282, 356), (795, 384)))
    # The close-up stays with the notebook. The jade was put in the drawer in this scene.
    crop = (88, 35, 1368, 755)
    return image.crop(crop), marked.crop(crop)


def manuscript():
    image = Image.open(MASTERS / 'office-comfy-source.png').convert('RGBA')
    paper = Image.new('RGBA', (800, 710))
    pen = ImageDraw.Draw(paper)
    pen.text((50, 32), '楚辞阅读', font=ImageFont.truetype(SERIF, 43), fill=(49, 46, 37, 204))
    body = ImageFont.truetype(SERIF, 30)
    pen.text((50, 134), '江边一个人，走两步，停一停，', font=body, fill=(49, 46, 37, 189))
    pen.text((50, 208), '谁也不等，谁也不追。', font=body, fill=(49, 46, 37, 189))
    pen.line([(257, 175), (363, 177), (465, 173)], fill=(130, 65, 53, 158), width=3)
    pen.line([(37, 207), (32, 225), (35, 244)], fill=(130, 65, 53, 159), width=4)
    pen.line([(422, 257), (454, 288), (511, 306)], fill=(130, 65, 53, 145), width=3)
    pen.text((55, 370), '这个人写得像真的见过。', font=hand_font(57), fill=(115, 57, 46, 236))
    pen.line([(50, 465), (245, 469), (636, 460)], fill=(130, 65, 53, 135), width=3)
    return lay_ink(image, paper, ((438, 111), (1047, 109), (1216, 722), (338, 764)))


def export(manifest, name, image, mobile_crop, thumbnail=True):
    image = image.convert('RGB')
    master = MASTERS / f'{name}.png'
    image.save(master)
    manifest['masters'][name] = master.relative_to(ROOT).as_posix()
    versions = {name: image, f'{name}-m': image.crop(mobile_crop)}
    if thumbnail:
        versions[f'{name}-thumb'] = image.resize((480, 270), Image.Resampling.LANCZOS)
    manifest['mobile'] = sorted(set(manifest['mobile']) | {name})
    manifest['mobileOriginals'][name] = f'{name}-m.webp'
    for key, version in versions.items():
        thumb = key.endswith('-thumb')
        version.save(ART / f'{key}.webp', quality=84 if thumb else 91, method=6)
        version.save(ART / f'{key}.avif', quality=54 if thumb else 65, speed=6, max_threads=2)
        if not thumb:
            version.save(ORIGINALS / f'{key}.webp', lossless=True, method=6)
            manifest['originals'][key] = f'{key}.webp'
    manifest['avif'] = sorted(set(manifest['avif']) | versions.keys())


def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    blank, marked = notebook()
    notebook_crop = (82, 35, 1182, 690)
    export(manifest, 'cg-modern-notebook-open', blank, notebook_crop, thumbnail=False)
    export(manifest, 'cg-modern-translation-r3', marked, notebook_crop)
    export(manifest, 'cg-modern-paper-note', manuscript(), (196, 61, 1396, 801))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
