"""Compile the author-approved domestic manuscript without touching either legacy campaign."""
from __future__ import annotations
import hashlib, json, re
from import_modern import ROOT, CIRCLED, pages
from shenci_polish import polish

SOURCE = ROOT / 'public/原著剧本-沈辞新版.txt'
HEAD = re.compile(r'^((?:[0-9]+|[A-Z]\d?)-\d+[a-z]?)\s+(.+)$')
TAG = re.compile(r'^【([^】]+)】(.*)$')
INLINE = re.compile(r'^([^\s　]{1,14})[　\t]+(.+)$')
STAGE = {'场景':'背景','背景':'背景','音':'音效','音效':'音效','立绘':'立绘','演出':'演出'}
CHOICES = {'选择','选项','关键选择','最终选择'}
OPEN = {
 '0-1':'cg-s01-dream-boat','0-2':'home-morning','0-3':'bus','0-4':'classroom-day','0-5':'school','0-6':'alley','0-7':'dream-boat','0-8':'bedroom','0-9':'school','0-10':'classroom','0-11':'nightmare',
 '1-2':'cg-modern-selection','1-3':'ritual','1-3a':'ritual','1-4':'hut','1-5':'village','1-6':'village','1-7':'river','1-8':'hut','1-9':'modern-night-river','1-10':'modern-night-river','1-11':'modern-night-river','1-12z':'hut','1-13':'village',
 '2-1':'classroom','2-2':'classroom-day','2-3':'bedroom','2-4':'school','2-5':'bedroom','3-1':'classroom','3-2':'classroom-day','3-3':'school','3-4':'bedroom',
 '4-1':'alley','4-2':'classroom-day','4-3':'modern-office','4-4':'modern-mountain-path','4-5':'modern-mountain-path',
}
ROYAL = {'E1-7':'哀郢·战死','E2-7':'哀郢·余党','G1-8':'国殇·守城','G2-8':'国殇·问名','L-8':'离骚·求索','S-8':'涉江·远游','H-8':'怀沙·沉江','R-6':'礼魂·招魂之夜','F-6':'渔父·与世推移','O-10':'橘颂·相拥二眠'}
KUNLUN = {'X-6':'湘夫人·走丢的孩子','N-6':'少司命·护不住也要抱','Y-6':'云中君·抓不住的水声','J-6':'湘君·往东的舟','S-6':'山鬼·认不出自己','M-6':'大司命·册外的名字','T-6':'东君·不肯停的太阳','H-6':'河伯·九条河','L-6':'礼魂·传芭','Z-6':'远游'}

def sceneid(group, key): return f'shenci-{group}-{key}'
def split_options(text):
    matches=list(re.finditer(r'([①②③④⑤⑥⑦⑧⑨⑩]|[AB][.．、])\s*',text))
    return [{'key':str(CIRCLED.index(m[1])+1) if m[1] in CIRCLED else m[1][0],
             'title':re.split(r'（(?:※|→|进)|\(※',text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)])[0].strip().rstrip('。'), 'detail':''}
            for i,m in enumerate(matches)]

def split_scenes(text):
    title=None; body=[]
    for raw in text.splitlines():
        m=HEAD.fullmatch(raw.strip())
        if m:
            if title: yield *title, body
            title=m.groups();body=[]
        elif title:body.append(raw.strip())
    if title: yield *title, body

META = re.compile(r'^(?:第[一二三四五六七八九十]+[幕段卷章]|线[一二三四五六七八九十]+\s|九条结局线|过场·|彩蛋接口|线间现代·第|附\s|【(?:序章终|结局|此线收束|接口|自查|V\d)|(?:[—─]+\s*)?下接[：:]|(?:[（(])(?:※|注[:：]|第[一二三四五六七八九十]+幕·完|线[一二三四五六七八九十]+·完|全文完|本书|全片最后一句|打字一般浮出|——(?:主线结局|九歌线全本)|不管走哪条|此处的选择))')

def parse(group,key,title,body,chapter,route,base):
    sid=sceneid(group,key);blocks=[]; choice=None; cond=None; multiline=False; tagged=None
    last_ask=None
    def emit(tag, value='', **props):
        b={'tag':tag,'lines':[value] if value else [],**props}
        if cond and tag != '演出': b['when']={'choice':cond[0],'value':cond[1]}
        blocks.append(b); return b
    i=0
    while i<len(body):
        l=body[i];i+=1
        if not l:continue
        if not set(l)-set('─━—_ '): cond=None;multiline=False;tagged=None;continue
        if META.match(l) or l in ('尾声','（王裔线·终）','（过渡·完）'):continue
        # Author's staged blackouts are audiovisual, not spoken dialogue.
        if l in ('（黑场。）','（切黑。）'):
            emit('演出',l);emit('旁白','',blackout=True,pages=['']);continue
        m=TAG.fullmatch(l)
        if m:
            tag,value=m.groups(); value=value.strip();tagged=None
            if tag in CHOICES:
                cond=(last_ask,'1') if tag=='最终选择' else None;multiline=False; raw=[value]
                while i<len(body) and re.match(r'^[①②③④⑤⑥⑦⑧⑨⑩]|^[AB][.．、]',body[i]):raw.append(body[i]);i+=1
                opts=split_options('　'.join(raw)); assert opts and all(x['title'] for x in opts), (sid,l)
                choice=f'{sid}:{len(blocks)}';emit('选择','　'.join(raw),options=opts)
                if tag=='关键选择':last_ask=choice
                if tag=='最终选择':cond=None
            elif tag in ('共同剧情','合'):
                cond=None;multiline=False
                if value:
                    dm=INLINE.fullmatch(value);emit(dm[1] if dm else '旁白',dm[2] if dm else value)
            elif (bm:=re.fullmatch(r'(?:若)?选([①②③④⑤⑥⑦⑧⑨⑩AB])',tag)):
                assert choice,(sid,tag); v=bm[1]; cond=(choice,str(CIRCLED.index(v)+1) if v in CIRCLED else v);multiline=not value
                if value:
                    dm=INLINE.fullmatch(value);emit(dm[1] if dm else '旁白',dm[2] if dm else value)
            elif tag.split('·')[0] in STAGE:emit(STAGE[tag.split('·')[0]],value)
            elif tag.startswith('走访'):cond=None;multiline=False;emit('演出',value)
            elif tag.startswith('镜'):emit('演出',value)
            elif tag in ('若仅通一线','POV','二周目·回到这一夜'):pass
            else:
                tagged=tag
                if value:emit(tag,value)
            continue
        bm=re.fullmatch(r'（若选([①②③④⑤⑥⑦⑧⑨⑩]|[AB])[，,。\s]*(.*)',l)
        if bm and choice:
            v=bm[1];cond=(choice,str(CIRCLED.index(v)+1) if v in CIRCLED else v);multiline=bm[2] in ('——）','—）', '）') or key=='C-1a'
            if bm[2] not in ('——）','—）','）'):emit('旁白','（'+bm[2]);
            tagged=None;continue
        dm=INLINE.fullmatch(l) if not l.startswith(('（','“','「','《','——')) else None
        if cond and not multiline and (not dm or (key=='1-12d' and dm[1]=='水边的人')):cond=None
        if dm:emit(dm[1],dm[2]);tagged=None
        elif not l.startswith(('※','——','　·')):emit(tagged or '旁白',l)
    for b in blocks:
        if b['tag'] not in ('背景','音效','立绘','演出','选择') and 'pages' not in b:
            b['pages']=[p for l in b['lines'] for p in pages(l)]
    return dict(id=sid,title=title,sourceId=key,chapter=chapter,route=route,script='shenci',background=base,blocks=blocks)

def main():
    raw=SOURCE.read_bytes();text=raw.decode('utf-8-sig'); parts=re.split(r'(?m)^第[一二三四五六七]卷[^\n]*\n',text)
    assert len(parts)==8
    scenes=[]; by={}
    old=json.loads((ROOT/'src/data/modern-index.json').read_text(encoding='utf-8'))
    old_bg={s['id']:s['background'] for s in old['scenes']}
    stage=(ROOT/'src/data/modernStaging.ts').read_text(encoding='utf-8').split('export const MODERN_STAGE_CUTS')[0]
    old_bg.update(dict(re.findall(r"'(modern-[rk]-[^']+)': '([^']+)'",stage)))
    def make(g,key,title,body,chapter,route,base=None):
        base=base or (OPEN.get(key) if g in ('d','m') else old_bg.get(f'modern-{g}-{key}')) or ('river' if g=='k' else 'village')
        s=parse(g,key,title,body,chapter,route,base);scenes.append(s);by[s['id']]=s;return s
    def connect(*ids):
        for l,r in zip(ids,ids[1:]):by[l]['next']=r
    def add_choice(s, options, prompt=None):
        b={'tag':'选择','lines':[],'options':[dict(key=str(i+1),title=label,detail='',target=target,**extra) for i,(label,target,*more) in enumerate(options) for extra in [more[0] if more else {}]]}
        if prompt:b['prompt']=prompt
        s['blocks'].append(b);return b
    def choices(s):return [b for b in s['blocks'] if b['tag']=='选择']
    def targets(s, ids):
        for o,target in zip(choices(s)[-1]['options'],ids,strict=True):o['target']=target
    def endings(g,table):
        for k,title in table.items():
            s=by[sceneid(g,k)];s.pop('next',None);s['ending']=f'shenci-royal-{k.split("-")[0].lower()}';s['endingTitle']=title
    dom=[]
    for key,title,body in split_scenes(parts[1]):
        early=key.startswith('0-');chapter='序章 · 水声之前' if early else '共通 · 借来的一口气' if ('1-12' not in key and key!='1-13') else '共通 · 天问七夜'
        if key=='1-12g':
            pos=body.index('尾声');dom.append(make('d',key,title,body[:pos],chapter,'common')['id']);dom.append(make('d','1-12z','河边 · 未完的问句',body[pos+1:],chapter,'common')['id']);continue
        if key=='1-13':
            chapter='分路 · 马车与清晨'; a,b,c=map(body.index,('【选①】','【选②】','【二周目·回到这一夜】'))
            fork=make('d',key,title,body[:a],chapter,'common');dom.append(fork['id']);
            for sid,ttl,chunk,dest in [('1-13a','接过烤薯',body[a+1:b],sceneid('r','A-1')),('1-13b','接过饼',body[b+1:c],sceneid('k','A-0'))]:
                make('d',sid,ttl,chunk,chapter,'common','village')['next']=dest
            targets(fork,[sceneid('d','1-13a'),sceneid('d','1-13b')]);make('d','1-13r','同一个清晨',body[c+1:],chapter,'common','village')['next']=fork['id'];continue
        dom.append(make('d',key,title,body,chapter,'prologue' if early else 'common')['id'])
    connect(*dom)
    r=[]
    for key,title,body in split_scenes(parts[2]):
        if key=='O-10':body=body[:next(i for i,l in enumerate(body) if l.startswith('第六幕'))]
        if key=='C-1a':
            a=next(i for i,l in enumerate(body) if l.startswith('【举报线】'));b=next(i for i,l in enumerate(body) if l.startswith('【此线收束】'))
            s=make('r',key,title,body[:a],'王裔 · 走访列臣','royal');r.append(s['id']);
            rr=make('r','C-1b','深夜 · 被举报',body[a+1:b],'王裔 · 走访列臣','royal','study')
            add_choice(rr,[('仍装作酒后胡言',sceneid('r','C-2')),('认下，不再装疯',sceneid('r','R-1'))]);continue
        r.append(make('r',key,title,body,'王裔 · 旧名与城破','royal')['id'])
    connect(*r);endings('r',ROYAL)
    royal=lambda key:sceneid('r',key)
    visit=by[royal('C-1a')]; visit['redirect']={'when':{'choice':f'{visit["id"]}:{visit["blocks"].index(choices(visit)[5])}','value':'1'},'target':royal('C-1b')}
    targets(by[royal('C-12')],[royal('D-1'),royal('D-13'),royal('L-1'),royal('F-1')]);targets(by[royal('D-11')],[royal('D-12'),royal('D-13'),royal('L-1')]);
    add_choice(by[royal('D-12')],[('留在东门',royal('E1-1')),('接下王位，守城',royal('G1-1')),('再翻一次那本册子',royal('G2-1'),{'requires':{'sceneId':royal('D-5')}})],'门已经开了。')
    add_choice(make('r','D-13','西渡口 · 走或留',[],'王裔 · 旧名与城破','royal','river'),[('跟着退下的人走',royal('E2-1')),('独自西行',royal('S-1')),('把名字还给河',royal('H-1')),('去见等在渡口的人',royal('O-1'),{'requires':{'sceneId':royal('D-7')}})],'船还没有离岸。')
    # The five source camera instructions become manual, silent beats in this preview.
    transition=parts[2].split('第六幕　国殇过渡',1)[1].split('（过渡·完）',1)[0]; g=make('r','G-0','19:37 · 国殇过场',[],'王裔 · 回到这边','royal','classroom')
    shots=re.split(r'(?m)^【镜\d】',transition)[1:];assert len(shots)==5
    for i,(shot,art) in enumerate(zip(shots,['classroom','classroom','bedroom','classroom','classroom-day'],strict=True)):
        narration=[l.strip() for l in shot.splitlines()[1:] if l.strip().startswith('（') and l.strip()!='（切黑。）']
        g['blocks'].append({'tag':'旁白','lines':[shot.splitlines()[0]],'pages':['' if i==0 else ''.join(narration)],'background':art,'blackout':i==0,'effects':['bronze'] if i==0 else []})
    g['next']=sceneid('m','2-1')
    k=[]; lead=parts[4].split('入线接口　巫班',1)[1].split('第一幕　入班',1)[0]
    k.append(make('k','A-0','巫班 · 第六个孩子',lead.splitlines(),'昆仑 · 巫班与远行','kunlun','hut')['id']);
    for key,title,body in split_scenes(parts[4]):
        if key=='Z-6':
            pos=next(i for i,l in enumerate(body) if l.startswith('彩蛋接口')); epilogue=body[pos+1:next(i for i,l in enumerate(body) if l.startswith('过场·昆仑终'))];body=body[:pos]
        k.append(make('k',key,title,body,'昆仑 · 巫班与远行' if key[0] in 'ABC' else '昆仑 · 诸神与水声','kunlun')['id'])
    connect(*k);kun=lambda key:sceneid('k',key)
    for key in KUNLUN:by[kun(key)]['next']=kun('G-1');by[kun(key)]['branchTitle']=KUNLUN[key]
    make('k','Z-7','现代过场 · 药铺',epilogue,'昆仑 · 远游','kunlun','modern-herb-eaves')['next']=kun('G-1');by[kun('Z-6')]['next']=kun('Z-7')
    p=by[kun('F-6')]; p['next']=kun('G-1');
    # The source leaves most affordances unspecified. Preview choices expose the existing prose without fabricating its branches.
    core=[('顺着水醒来',kun('G-1')),('再看一眼屋檐',kun('X-1')),('跟着那件小衣服',kun('N-1')),('听云里的水声',kun('Y-1')),('随湘君向东',kun('J-1'))]
    alt=[('跟着鸟走',kun('S-1')),('翻开那卷竹简',kun('M-1')),('去看那一刻的太阳',kun('T-1')),('选一条河',kun('H-1')),('传完那束芭草',kun('L-1')),('继续远游',kun('Z-1'),{'requires':{'sceneId':kun('F-4'),'lastChoice':'1'}})]
    core.append(('再听一听诸神的回声',kun('F-7'))); add_choice(p,core,'蓝色还没退尽。'); add_choice(make('k','F-7','昆仑 · 诸神的回声',[],'昆仑 · 诸神与水声','kunlun','light-river'),alt)
    win=by[kun('G-4')];win.pop('next',None);win['ending']='shenci-kunlun';win['endingTitle']='仿佛到了昆仑'
    for part,idx,chapter in ((parts[3],'2','返场 · 国殇之后'),(parts[5],'3','返场 · 九歌之后'),(parts[6],'4','彩蛋 · 另一边的日子')):
        ids=[]
        for key,title,body in split_scenes(part):
            if key in ('2-5','3-4'):body=body[:next(i for i,l in enumerate(body) if l.startswith('【选项】'))]
            s=make('m',key,title,body,chapter,'return');ids.append(s['id']);
            if key in ('2-5','3-4'):
                s['interlude']=True
                add_choice(s,[('回到马车旁',sceneid('d','1-13r'))],'烤薯还烫，饼还温着。')
            if key=='4-5':s['ending']='shenci-home';s['endingTitle']='递水的人'
        connect(*ids)
    unlock=parts[5].split('线间现代·第二段终 → 彩蛋线（解锁判定）',1)[1].split('【若仅通一线】',1)[0]
    make('m','4-0','古图 · 两道裂纹',unlock.splitlines(),'彩蛋 · 另一边的日子','return','bedroom')['next']=sceneid('m','4-1')
    return_cut=by[sceneid('m','4-0')]; scenes.remove(return_cut);scenes.insert(scenes.index(by[sceneid('m','4-1')]),return_cut)
    # Bind by reviewed source text anchors instead of reusing overseas page numbers.
    cuts={
        ('d','0-1'):[('随后显出','cg-s01-dream-boat'),('卧室。床头','bedroom'),('手机屏幕再亮','bedroom-morning'),('母亲待他很好','home-morning')],
        ('d','0-4'):[('食堂。唐瑾','canteen-day')],('d','0-8'):[('食堂','canteen-day'),('沈家','bedroom-evening')],
        ('d','1-12z'):[('到了河边','modern-night-river')],('d','1-13'):[('一个人递烤薯','cg-modern-fork')],
        ('r','C-1a'):[('令尹府','modern-minister-hall'),('太祝府','modern-minister-ancestor'),('老将府','modern-minister-veteran'),('外戚府','modern-minister-inlaw'),('老臣府','modern-minister-orange')],
        ('k','D-7'):[('六个人坐在空舱','modern-river-aboard')],('k','F-5'):[('一位神，从最高处下来','cg-modern-donghuang')],('k','F-6'):[('青蓝，褪成灰白','river'),('只剩那碗粥','cg-modern-cold-porridge')],
        ('k','C-3'):[('捧着一碗热粥','cg-modern-porridge-offering')],('k','G-1'):[('数一数。是孩子','cg-modern-quiet-shoal-six')],('k','G-2'):[('旁边立着一块木牌','cg-modern-porridge-plaque')],
        ('m','2-2'):[('周老师坐在办公桌后面','modern-office')],('m','2-3'):[('月考后。教室','classroom-day'),('夜里还会醒','bedroom'),('白天上课','classroom-day')],('m','4-1'):[('药店檐下','modern-herb-eaves'),('琴行','alley')],('m','4-3'):[('到家以后','home')],('m','4-5'):[('沈辞抬头','modern-mountain-path')],
    }
    for (g,key),rules in cuts.items():
        for anchor,art in rules:
            first=next((b for b in by[sceneid(g,key)]['blocks'] if anchor in ''.join(b['lines']) and b['tag'] not in ('音效','选择')),None)
            if first:first['background']=art
    for key,base in {'C-4':'river','D-5':'cg-modern-storm','D-6':'cg-modern-storm','F-6':'light-river','G-1':'cg-modern-quiet-shoal','G-2':'cg-modern-cold-porridge','G-3':'cg-modern-porridge-plaque','G-4':'cg-modern-shoal-cord'}.items():by[kun(key)]['background']=base
    # Main text remains verbatim in lines. For alternative Wangyi endings the authored modern return still follows;
    # a source-neutral cut skips the explicit fatal-collapse recollection when it did not happen.
    return_scene=by[sceneid('m','2-1')]
    for b in return_scene['blocks']:
        if any(x in ''.join(b['lines']) for x in ('听见那一声塌','不是耳朵听见的')):b['royalCollapseOnly']=True
    # A common paragraph after the landlord's optional response leads into the nested question.
    first=next(i for i,b in enumerate(visit['blocks']) if '天色暗下来的时候，戌起身告辞' in ''.join(b['lines']))
    for b in visit['blocks'][first:visit['blocks'].index(choices(visit)[4])]:b.pop('when',None)
    for s in scenes:
        # Additional explicit location directives choose already shipped art; text references alone never cut a scene.
        if s['id'].startswith(('shenci-d-','shenci-m-')):
            location_rules=[('血沼','marsh'),('操场','school'),('晚自习','classroom'),('沈家卧室','bedroom'),('走廊','classroom-day'),('办公室','modern-office'),('食堂','canteen-day'),('河岸','modern-night-river'),('灶上','hut')]
            for b in s['blocks']:
                if b['tag']=='背景' and 'background' not in b:
                    for cue,bg in location_rules:
                        if cue in ''.join(b['lines']):b['background']=bg;break
        polish(s)
        for t in [s.get('next'),s.get('redirect',{}).get('target'),*[o.get('target') for b in choices(s) for o in b['options']]]:
            if t:assert t in by,(s['id'],t)
        assert s['blocks'],s['id']
    metadata={'title':'异托邦 · 沈辞新版','sourceSha256':hashlib.sha256(raw).hexdigest(),'sceneCount':len(scenes),'pageCount':sum(len(b.get('pages',[])) for s in scenes for b in s['blocks'])}
    opening=[s for s in scenes if s['route']=='prologue']
    story=[s for s in scenes if s['route']!='prologue']
    music_cues={s['id']:list(dict.fromkeys(b['musicCue'] for b in s['blocks'] if b.get('musicCue'))) for s in scenes}
    index={**metadata,'scenes':[{k:v for k,v in s.items() if k!='blocks'} for s in scenes],
           'musicCues':{scene:cues for scene,cues in music_cues.items() if cues}}
    for file,data in [('shenci-opening.json',{'scenes':opening}),('shenci-story.json',{'scenes':story}),('shenci-index.json',index)]:
        (ROOT/'src/data'/file).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(f"Shenci: {len(scenes)} scenes, {metadata['pageCount']} pages")
if __name__=='__main__':main()
