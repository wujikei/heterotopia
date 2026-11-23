"""Import the supplied overseas modern volume and its new-screenplay interfaces.

The original V6 data is never rewritten. Source prose is retained in blocks;
pagination and choices are display metadata. Re-run after editing the sources.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '最新/异托邦_完整剧情_人称标注版.txt'
MODERN = ROOT / '最新/异托邦_海外版现代线_独立卷.txt'
HEADING = re.compile(r'^((?:\d+|[A-Z]\d?)-\d+[a-z]?)\s+(.+)$')
TAG = re.compile(r'^【([^】]+)】(.*)$')
CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩'
SCENES: list[dict] = []


def pages(text: str, limit: int = 120) -> list[str]:
    chunks = re.findall(r'.*?[。！？；](?:[”’」』]+)?|.+$', text)
    out, current = [], ''
    for chunk in chunks:
        if current and len(current + chunk) > limit:
            out.append(current)
            current = ''
        current += chunk
    if current:
        out.append(current)
    assert ''.join(out) == text
    return out or [text]


def section(text: str, start: str, end: str) -> str:
    match = re.search(r'^' + re.escape(start), text, re.M)
    if not match: raise ValueError('Missing section: ' + start)
    remaining = text[match.end():]
    end_match = re.search(r'^' + re.escape(end), remaining, re.M)
    if not end_match: raise ValueError('Missing section end: ' + end)
    return remaining[:end_match.start()]


def default_background(group: str, title: str) -> str:
    if group == 'o':
        if '问字' in title: return 'cg-modern-word-stall'
        if '宿舍' in title or '国殇之后' in title: return 'modern-dorm'
        if '九歌之后' in title: return 'modern-library'
        if '谈话' in title or '方向' in title: return 'modern-office'
        if '半规落日' in title or '山顶' in title: return 'modern-sunset'
        if '上山' in title or '离骚默写' in title or '一瞬' in title: return 'modern-mountain-path'
        if '土岸' in title or '选巫' in title: return 'ritual'
        if '阿媪' in title or '木匣' in title: return 'hut'
        if '镇上' in title: return 'village'
        return 'river'
    if group == 'c': return 'village'
    for words, bg in [(['书房', '旧箱', '屈宅', '试衣'], 'study'),
                      (['楚宫', '偏殿', '朝会', '王', '宫廊'], 'palace'),
                      (['地宫', '密室', '认尸'], 'tomb'),
                      (['祭', '高台', '招魂', '排演', '戏'], 'ritual'),
                      (['城', '战', '倒下'], 'ruins'),
                      (['屋', '被窝', '小衣', '药包'], 'hut'),
                      (['山鬼', '山', '野果'], 'mountain'),
                      (['诸神', '东皇', '没有黑', '蓝色', '云中君', '河伯', '司命', '湘', '东君', '礼魂'], 'light-river')]:
        if any(word in title for word in words): return bg
    return 'river' if group == 'k' else 'village'


def import_section(text: str, group: str, route: str, chapter: str) -> list[dict]:
    imported, scene, block = [], None, None
    choice_id = ''
    condition = None
    tagged_speaker = None
    narrative_branch = False
    stop_scene = False

    def flush():
        nonlocal block
        if block and scene is not None and block['lines']:
            if block['tag'] not in ('背景', '音效', '立绘', '演出', '选择'):
                block['pages'] = [p for line in block['lines'] for p in pages(line)]
            scene['blocks'].append(block)
        block = None

    def append(tag: str, text: str, *, when=None):
        nonlocal block
        flush()
        block = {'tag': tag, 'lines': [text] if text else []}
        if when: block['when'] = when.copy()
        # New overseas protagonists never inherit Shen Ci's school memories.
        if group in ('r', 'k') and any(name in text for name in ('沈辞', '宋嘉树', '唐瑾', '教室后门', '走廊尽头的门')):
            block['domesticOnly'] = True

    for raw in text.splitlines():
        line = raw.strip()
        match = HEADING.match(line)
        if match:
            flush()
            sid, title = match.groups()
            scene = {'id': f'modern-{group}-{sid}', 'sourceId': sid, 'title': title,
                     'chapter': chapter, 'route': route, 'script': 'modern',
                     'background': default_background(group, title), 'blocks': []}
            SCENES.append(scene)
            imported.append(scene)
            condition, tagged_speaker, narrative_branch, stop_scene = None, None, False, False
            choice_id = ''
            continue
        if scene is None: continue
        if not line:
            flush()
            continue
        if set(line) <= set('─━—_ '):
            flush()
            condition, tagged_speaker, narrative_branch = None, None, False
            continue
        if re.match(r'^(第[一二三四五六七八九十]+[卷章幕段]|线[一二三四五六七八九十]+\s|九条结局线|附[　\s]|【接口|【编者注|（编者注|（注：|（※|—— 下接|（第[一二三四五六七八九十]+幕·完）|（全文完）|（全片|（触发：|（不管走|（本章|（人物名|（海外版|（王裔线＝|（昆仑线＝)', line):
            flush()
            if '幕·完' in line or line.startswith('附'):
                stop_scene = True
            continue
        if stop_scene: continue
        tag_match = TAG.match(line)
        if tag_match:
            tag, inline = tag_match.groups()
            if tag == 'POV': continue
            if tag.startswith(('接口', '结局', '自查', 'V')): continue
            if tag == '二周目·回到这一夜': break
            if tag in ('场景', '背景', '音', '音效', '立绘', '演出'):
                tagged_speaker = None
                append({'场景': '背景', '音': '音效'}.get(tag, tag), inline, when=condition)
                continue
            if tag in ('选择', '选项', '关键选择', '最终选择'):
                flush()
                condition, tagged_speaker = None, None
                choice_id = f"{scene['id']}:{len(scene['blocks'])}"
                block = {'tag': '选择', 'lines': [inline] if inline else []}
                continue
            if tag.startswith(('若选', '选①', '选②')):
                flush()
                value = re.search('[①②③④⑤⑥⑦⑧⑨⑩AB]', tag)
                if value:
                    condition = {'choice': choice_id or f"{scene['id']}:0", 'value': str(CIRCLED.index(value[0])+1) if value[0] in CIRCLED else value[0]}
                continue
            if tag == '共同剧情':
                flush()
                condition = None
                continue
            if tag.startswith(('走访', '镜')):
                condition, tagged_speaker = None, None
                if inline: append('演出', inline)
                continue
            if tag in ('举报线', '此线收束'):
                stop_scene = True
                continue
            tagged_speaker = tag
            append(tag, inline, when=condition)
            continue
        if block and block['tag'] == '选择' and line[:1] in CIRCLED + 'AB':
            block['lines'].append(line)
            continue
        if line.startswith('（若选'):
            flush()
            branch = re.match(r'（若选([①②③④⑤⑥⑦⑧⑨⑩AB])[，,。\s]*(.*)', line)
            if branch and choice_id:
                value, rest = branch.groups()
                condition = {'choice': choice_id, 'value': str(CIRCLED.index(value)+1) if value in CIRCLED else value}
                append('旁白', '（' + rest, when=condition)
                narrative_branch = True
            continue
        # Single-paragraph local branches in the Kunlun scenes converge at
        # the following paragraph. Dialogue branches continue to a separator.
        if narrative_branch and group in ('k', 'o') and line.startswith('（'):
            condition, narrative_branch = None, False
        if line.startswith(('（', '“', '「')):
            if line.startswith(('（——', '（想完')):
                if line.startswith('（——'): continue
                condition = None
            tagged_speaker = None
            append('旁白', line, when=condition)
        else:
            spoken = re.match(r'^([^\s　]{1,14})[　\t]+(.+)$', line)
            if spoken:
                speaker, speech = spoken.groups()
                append(speaker, speech, when=condition)
                tagged_speaker = None
            elif tagged_speaker:
                if block is None: append(tagged_speaker, line, when=condition)
                else: block['lines'].append(line)
            elif block and block['tag'] in ('背景', '音效', '立绘', '演出'):
                block['lines'].append(line)
            elif not line.startswith(('（——', '※', '——')):
                append('旁白', line, when=condition)
    flush()
    for first, second in zip(imported, imported[1:]): first['next'] = second['id']
    return imported


def configure_options(scene: dict):
    for index, block in enumerate(scene['blocks']):
        if block['tag'] != '选择': continue
        text = '　'.join(block['lines'])
        found = list(re.finditer(r'([①②③④⑤⑥⑦⑧⑨⑩]|[AB][.．、])\s*', text))
        options = []
        for i, match in enumerate(found):
            title = text[match.end():found[i+1].start() if i+1 < len(found) else len(text)].strip()
            title = re.split(r'（※|\(※|（→|\(→', title)[0].rstrip('　，。')
            if not title: continue
            options.append({'key': str(i+1), 'title': title, 'detail': ''})
        block['options'] = options
        if not options: raise ValueError(f"Unparsed choice {scene['id']}:{index}: {text}")


def apply_adaptations():
    """Keep supplied manuscripts intact; fail on source drift instead of fuzzy replacing."""
    path = ROOT / 'scripts/modern-adaptations.json'
    by_id = {scene['id']: scene for scene in SCENES}
    seen = set()
    for patch in json.loads(path.read_text(encoding='utf-8')):
        key = (patch['scene'], patch['block'])
        if key in seen: raise ValueError(f'Duplicate adaptation: {key}')
        seen.add(key)
        block = by_id[patch['scene']]['blocks'][patch['block']]
        if block['tag'] != '旁白' or block['lines'] != [patch['source']]:
            raise ValueError(f'Adaptation source changed: {key}; review the manuscript before reapplying')
        block['lines'] = [patch['text']]
        block['pages'] = pages(patch['text'])
    # One existing paragraph, not an inserted block: bookmark and choice IDs stay stable.
    by_id['modern-o-4-1']['blocks'][7]['returnMemory'] = True
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    whole = SOURCE.read_text(encoding='utf-8-sig')
    modern = MODERN.read_text(encoding='utf-8-sig')
    # Modern-volume navigation is metadata, never player narration.
    modern_parts = []
    for start, end in [('0-1　问字摊', '【接口 ①】'), ('4-1　国殇之后', '【接口 ②】'),
                       ('4-2　九歌之后', '【接口 ③】'), ('5-1　被叫去谈话', '（全文完）')]:
        body = start + section(modern, start, end)
        modern_parts += import_section(body, 'o', 'prologue' if start.startswith('0-') else 'return',
                                       '现代卷 出发之前' if start.startswith('0-') else '线间 这边的日子' if start.startswith('4-') else '尾声 半规落日')
    ancient_opening = import_section('0-3　土岸·跪着的人' + section(whole, '0-3　土岸·跪着的人', '第三章　两条主线'),
                                     'o', 'common', '共通卷 天问七夜')
    junction = import_section('1-13　马车·与谁说话' + section(whole, '1-13　马车·与谁说话', '第二卷　王裔线'),
                             'c', 'common', '分路 一样清晨')
    for marker, scene_id, title, target in (
        ('【选①】', 'modern-c-1-13a', '接过烤薯', 'modern-r-A-1'),
        ('【选②】', 'modern-c-1-13b', '接过饼', 'modern-k-A-1'),
    ):
        start = re.search(r'^' + re.escape(marker) + r'\s*$', whole, re.M)
        if not start: raise ValueError('Missing source outcome: ' + marker)
        rest = whole[start.end():]
        end = re.search(r'^【选②】\s*$', rest, re.M) if marker == '【选①】' else re.search(r'^【二周目·回到这一夜】\s*$', rest, re.M)
        if not end: raise ValueError('Missing next source outcome: ' + marker)
        outcome = import_section('1-13z ' + title + '\n' + rest[:end.start()], 'c', 'common', '分路 一样清晨')[0]
        outcome['id'], outcome['sourceId'], outcome['title'], outcome['next'] = scene_id, marker, title, target
    royal = import_section(section(whole, '第二卷　王裔线', '第三卷　线间现代'), 'r', 'royal', '王裔卷 旧名与城破')
    kunlun = import_section(section(whole, '第四卷　昆仑线', '第五卷　线间现代'), 'k', 'kunlun', '昆仑卷 诸神与水声')
    by_id = {scene['id']: scene for scene in SCENES}
    assert len(by_id) == len(SCENES)
    # Culture selection belongs before the seventh night's reflection, not
    # in the unrelated dormitory opening.
    culture = next(s for s in ancient_opening if s['sourceId'] == '2-6')
    culture_choice = {'tag': '选择', 'lines': ['你从哪个文化圈来？'], 'options': [
        {'key': str(i+1), 'title': title, 'detail': '只影响此夜的内心联想。'} for i, title in enumerate(['西方', '中东', '南亚', '东亚'])]}
    culture['blocks'].insert(0, culture_choice)
    for block in culture['blocks']:
        if block.get('when'): block['when']['choice'] = culture['id'] + ':0'
    # The volume introduces this question before night one; remove the
    # duplicate from the previous scene's trailing navigation.
    for s in ancient_opening:
        if s['sourceId'] == '0-8':
            s['blocks'] = [b for b in s['blocks'] if b['tag'] != '选择']
    for scene in SCENES:
        for b in scene['blocks']:
            if b['tag'] == '选择' and 'options' not in b: configure_options(scene); break
    by_id['modern-o-0-2']['next'] = 'modern-o-0-3'
    by_id['modern-o-2-7']['next'] = 'modern-c-1-13'
    fork = next(b for b in junction[0]['blocks'] if b['tag'] == '选择')
    fork['options'][0]['target'] = 'modern-c-1-13a'
    fork['options'][1]['target'] = 'modern-c-1-13b'
    # Source branch outcomes are displayed after choosing, before handoff.
    for s in junction:
        s['blocks'] = s['blocks'][:s['blocks'].index(fork)+1]
    # Route exits never fall through into another ending's prose.
    royal_ends = {'E1-7': '哀郢·战死', 'E2-7': '哀郢·随队', 'G1-8': '国殇·鬼雄',
                  'G2-8': '招魂·两个名字', 'L-8': '离骚·还在走', 'S-8': '涉江·不顾',
                  'H-8': '怀沙·石头上的字', 'R-6': '礼魂·传芭', 'F-6': '渔父·濯足', 'O-10': '橘颂·相拥二眠'}
    for s in royal:
        if s['sourceId'] in royal_ends:
            s['ending'] = 'modern-royal-' + s['sourceId'].split('-')[0].lower()
            s.pop('next', None)
    by_id['modern-r-D-12']['next'] = 'modern-r-E1-1'
    decision = next(b for b in by_id['modern-r-D-11']['blocks'] if b['tag'] == '选择')
    for option, target in zip(decision['options'], ['modern-r-D-12', 'modern-r-E2-1', 'modern-r-L-1']): option['target'] = target
    c12 = next(b for b in by_id['modern-r-C-12']['blocks'] if b['tag'] == '选择')
    for option, target in zip(c12['options'], ['modern-r-D-1', 'modern-r-E2-1', 'modern-r-L-1', 'modern-r-F-1']): option['target'] = target
    # An optional exit named in the source's western-ferry option is exposed
    # at the actual door, with source ending titles rather than invented plot.
    for s in kunlun:
        if s['sourceId'] in ('X-6','N-6','Y-6','J-6','S-6','M-6','T-6','H-6','L-6','Z-6'):
            s['next'] = 'modern-k-G-1'
    by_id['modern-k-G-4']['ending'] = 'modern-kunlun'
    by_id['modern-k-G-4'].pop('next', None)
    by_id['modern-o-5-7']['ending'] = 'modern-home'
    by_id['modern-o-5-7'].pop('next', None)
    for sid in ('4-1', '4-2'):
        s = by_id[f'modern-o-{sid}']
        s.pop('next', None)
        s['blocks'] = [b for b in s['blocks'] if not (b['tag'] == '旁白' and any(w in ''.join(b['lines']) for w in ('接口', '编者注', '第一段', '第二段', '第三段', '第四段')))]
        options = next(b for b in s['blocks'] if b['tag'] == '选择')['options']
        options[0]['target'] = options[1]['target'] = 'modern-c-1-13'
    # Strip production directions appended after the ending and source tables.
    for s in royal + kunlun:
        for i,b in enumerate(s['blocks']):
            if b['tag'].startswith(('镜', 'V')) or any(x in ''.join(b['lines']) for x in ('国殇过渡 G-TRANS', '伏笔收录表', '原版兼容接口', '第六幕', '自查清单', '过场·昆仑终', '过场·王裔终', '主线结局', '回到 1-13', '最终选择', 'POV')):
                s['blocks'] = s['blocks'][:i]
                break
        s['blocks'] = [b for b in s['blocks'] if not (b.get('when', {}).get('choice') == s['id'] + ':0' and not any(x['tag'] == '选择' for x in s['blocks']))]
    for s in (by_id['modern-c-1-13a'], by_id['modern-c-1-13b']):
        for block in s['blocks']: block.pop('when', None)
    for s in SCENES:
        if not any(b.get('pages') or b.get('options') for b in s['blocks']): raise ValueError('Empty scene: ' + s['id'])
        if s.get('next'): assert s['next'] in by_id, s['id']
        for b in s['blocks']:
            for c in b.get('options', []):
                if c.get('target'): assert c['target'] in by_id, c
    adaptation_sha = apply_adaptations()
    dest = ROOT/'src/data/modern-story.json'
    metadata = {'adaptationSha256': adaptation_sha, 'title': '异托邦·海外现代线', 'edition': 'modern-2026-11', 'sceneCount': len(SCENES),
                'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                'modernSourceSha256': hashlib.sha256(MODERN.read_bytes()).hexdigest(),
                'pageCount': sum(len(b.get('pages', [])) for s in SCENES for b in s['blocks']),
                'scenes': SCENES, 'royalEndings': royal_ends}
    dest.write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    index = {**metadata, 'scenes': [{k:v for k,v in s.items() if k!='blocks'} for s in SCENES]}
    (ROOT/'src/data/modern-index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (ROOT/'public/原著剧本-海外现代线.txt').write_bytes(MODERN.read_bytes())
    (ROOT/'public/原著剧本-剧情增补.txt').write_bytes(SOURCE.read_bytes())
    print(f"Modern campaign: {len(SCENES)} scenes, {metadata['pageCount']} pages; V6 unchanged.")


if __name__ == '__main__': main()
