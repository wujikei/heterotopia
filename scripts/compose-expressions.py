"""Register expression contact sheets and edit only the original face pixels.

The full silhouette, alpha and pixels outside the feathered face mask remain
pixel-identical to the original. Proofs must be reviewed before --export.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STATES = ['default', 'smile', 'surprised', 'angry', 'sad', 'closed']
# Coordinates in the 352px reference cell. Keep jawline and hair untouched.
FACE_MASKS = {
    'shen': [(122,220), (147,210), (180,204), (208,195), (237,188), (241,217), (238,249), (229,281), (212,303), (186,304), (158,288), (134,265)],
    'xu': [(133,207), (155,188), (180,183), (198,173), (232,170), (255,183), (263,213), (259,252), (243,290), (225,317), (196,319), (166,299), (145,272)],
    'quheng': [(98,155), (124,137), (167,135), (199,147), (218,171), (226,211), (220,249), (196,271), (162,274), (132,253), (105,220)],
    'xua': [(108,204), (128,179), (159,169), (198,171), (221,186), (239,209), (235,245), (223,275), (197,304), (170,316), (143,302), (120,272), (105,237)],
    # The blindfold is excluded completely, including its curved lower edge.
    'yu': [(194,235), (225,228), (248,219), (270,219), (270,238), (262,255), (256,273), (248,290), (226,290), (205,278), (188,263), (176,248), (176,237)],
    'amao': [(132,155), (155,141), (192,146), (224,164), (249,186), (265,215), (253,250), (226,269), (201,274), (172,260), (151,235), (134,211), (126,182)],
    'tang': [(95,193), (117,177), (148,170), (180,161), (206,170), (222,191), (228,224), (223,255), (203,281), (179,295), (154,285), (130,267), (111,240), (98,220)],
    'yuan': [(134,226), (159,217), (187,218), (220,209), (248,217), (255,239), (251,271), (237,299), (217,314), (190,317), (163,303), (142,279), (130,252)],
}


def composite_reference(image: Image.Image) -> np.ndarray:
    background = Image.new('RGBA', image.size, (238, 237, 229, 255))
    return np.array(Image.alpha_composite(background, image.convert('RGBA')).convert('RGB'))


def register(template: np.ndarray, moving: np.ndarray, face_mask: np.ndarray) -> tuple[np.ndarray, dict]:
    """Use unchanged hair detail for affine registration; exclude expression area."""
    gray_t = cv2.cvtColor(template, cv2.COLOR_RGB2GRAY)
    gray_m = cv2.cvtColor(moving, cv2.COLOR_RGB2GRAY)
    feature_mask = np.uint8((gray_t < 150) & (face_mask < .01)) * 255
    feature_mask[int(template.shape[0] * .73):] = 0
    sift = cv2.SIFT_create(nfeatures=2500, contrastThreshold=.02)
    kt, dt = sift.detectAndCompute(gray_t, feature_mask)
    km, dm = sift.detectAndCompute(gray_m, None)
    matrix, inliers, method = None, None, 'sift-ransac'
    if dt is not None and dm is not None:
        pairs = cv2.BFMatcher().knnMatch(dm, dt, k=2)
        good = [a for a, b in pairs if a.distance < .78 * b.distance]
        if len(good) >= 4:
            source = np.float32([km[p.queryIdx].pt for p in good])
            target = np.float32([kt[p.trainIdx].pt for p in good])
            matrix, inliers = cv2.estimateAffinePartial2D(source, target, method=cv2.RANSAC, ransacReprojThreshold=4, maxIters=6000)
    if matrix is None:
        # ECC works when texture correspondences are too sparse for SIFT.
        inverse = np.float32([[1, 0, 0], [0, 1, 0]])
        try:
            _, inverse = cv2.findTransformECC(gray_t.astype('float32') / 255, gray_m.astype('float32') / 255, inverse, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 250, 1e-6), feature_mask, 5)
            matrix = cv2.invertAffineTransform(inverse)
            method = 'ecc-affine'
        except cv2.error as error:
            raise RuntimeError('Registration failed; provide a matching original portrait reference.') from error
    scale = float(np.sqrt(matrix[0, 0] ** 2 + matrix[1, 0] ** 2))
    if not .65 <= scale <= 1.4:
        raise RuntimeError(f'Unsafe registration scale {scale:.3f}; inspect source sheet.')
    aligned = cv2.warpAffine(moving, matrix, (template.shape[1], template.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)
    return aligned, {'method': method, 'matrix': matrix.tolist(), 'inliers': int(inliers.sum()) if inliers is not None else None, 'scale': scale}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key', required=True)
    parser.add_argument('--sheet', type=Path, required=True)
    parser.add_argument('--states', nargs='+', default=DEFAULT_STATES)
    parser.add_argument('--columns', type=int, default=3)
    parser.add_argument('--config', type=Path, default=ROOT / 'artifacts/ui-fix-3/head-crops.json')
    parser.add_argument('--mask', type=Path, help='JSON polygon coordinates in referenceCell units')
    parser.add_argument('--output', type=Path, default=ROOT / 'artifacts/ui-fix-3/proofs')
    parser.add_argument('--export', action='store_true', help='Export reviewed PNG masters and web variants; never updates manifest')
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding='utf-8-sig'))[args.key]
    original = Image.open(ROOT / config['source']).convert('RGBA')
    box = config['box']
    crop = original.crop(box)
    size = crop.width
    template = composite_reference(crop)
    reference_size = config.get('referenceCell', 352)
    polygon = json.loads(args.mask.read_text(encoding='utf-8-sig')) if args.mask else FACE_MASKS.get(args.key)
    if not polygon:
        raise RuntimeError(f'No reviewed face mask for {args.key}; supply --mask.')
    hard_mask = Image.new('L', (size, size))
    ImageDraw.Draw(hard_mask).polygon([(round(x * size / reference_size), round(y * size / reference_size)) for x, y in polygon], fill=255)
    # Blur inward only: the exterior of the approved polygon stays untouched.
    soft_mask = np.array(hard_mask.filter(ImageFilter.GaussianBlur(6 * size / reference_size)), dtype=float) / 255
    soft_mask[np.array(hard_mask) == 0] = 0
    sheet = Image.open(args.sheet).convert('RGB')
    rows = (len(args.states) + args.columns - 1) // args.columns
    cell_w, cell_h = sheet.width // args.columns, sheet.height // rows
    args.output.mkdir(parents=True, exist_ok=True)
    report = {'key': args.key, 'source': config['source'], 'sheet': str(args.sheet), 'face_only': True, 'exports': [], 'states': {}}
    contact = Image.new('RGB', (size * 3, (size + 30) * 2), (238, 237, 229))
    ImageDraw.Draw(contact).text((10, 5), f'{args.key}: original', fill='black')
    contact.paste(Image.fromarray(template), (0, 30))
    proofs = 0
    for index, state in enumerate(args.states):
        if state == 'default':
            continue
        col, row = index % args.columns, index // args.columns
        moving = np.array(sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)).resize((size, size), Image.Resampling.LANCZOS))
        aligned, metrics = register(template, moving, soft_mask)
        # Match the broad skin tone, leaving local expression shading intact.
        ring = (soft_mask > .15) & (soft_mask < .55) & (template.min(axis=2) > 80)
        if ring.sum() > 10:
            shift = np.median(template[ring].astype(float) - aligned[ring].astype(float), axis=0)
            aligned = np.clip(aligned.astype(float) + np.clip(shift, -18, 18), 0, 255)
        blended = np.round(template * (1 - soft_mask[..., None]) + aligned * soft_mask[..., None]).astype(np.uint8)
        # Read from the RGBA source, preserving transparent RGB as well as alpha.
        edited_crop = np.array(crop)
        visible = soft_mask > 0
        edited_crop[..., :3][visible] = blended[visible]
        result = original.copy()
        result.paste(Image.fromarray(edited_crop), (box[0], box[1]))
        name = f'portrait-{args.key}-{state}'
        proof = args.output / f'{name}.png'
        result.save(proof)
        original_array, edited_array = np.array(original), np.array(result)
        diff = np.any(original_array[..., :3] != edited_array[..., :3], axis=2)
        full_mask = np.zeros(original_array.shape[:2], dtype=bool)
        full_mask[box[1]:box[3], box[0]:box[2]] = visible
        metrics.update({'changed_pixels': int(diff.sum()), 'changed_outside_face': int((diff & ~full_mask).sum()), 'alpha_identical': bool(np.array_equal(original_array[..., 3], edited_array[..., 3])), 'proof': str(proof)})
        if not diff.any() or metrics['changed_outside_face'] or not metrics['alpha_identical']:
            raise RuntimeError(f'Face-only invariant failed: {state}: {metrics}')
        report['states'][state] = metrics
        proofs += 1
        x, y = (proofs % 3) * size, (proofs // 3) * (size + 30)
        contact.paste(Image.fromarray(blended), (x, y + 30))
        ImageDraw.Draw(contact).text((x + 10, y + 5), state, fill='black')
        if args.export:
            master = ROOT / 'resources/art-src/expressions' / f'{name}.png'
            master.parent.mkdir(parents=True, exist_ok=True)
            result.save(master)
            for extension, settings in [('webp', {'quality': 91, 'method': 6}), ('avif', {'quality': 62, 'speed': 6, 'max_threads': 2})]:
                result.save(ROOT / 'public/art' / f'{name}.{extension}', extension.upper(), **settings)
                result.resize((640, 960), Image.Resampling.LANCZOS).save(ROOT / 'public/art' / f'{name}-m.{extension}', extension.upper(), **settings)
            report['exports'].append({'name': name, 'master': str(master.relative_to(ROOT)), 'avif': True, 'mobile': True})
    contact.save(args.output / f'{args.key}-expression-contact.png')
    (args.output / f'{args.key}-composition.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
