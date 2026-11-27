"""Source-anchored presentation metadata for the domestic campaign only."""
from __future__ import annotations

ART = {
 'd-0-11': [('门外是一片血红色的沼泽','marsh')],
 'd-1-2': [('白日。夯土高台','shenci-ritual-steps')],
 'd-1-3': [('同上。日头偏西','shenci-ritual-steps')],
 'd-1-3a': [('坛下。日头落到台后','shenci-ritual-steps')],
 'd-1-5': [('出村先过一道土堤','shenci-reeds-dawn'),('石板街从堤下一直铺到镇里','village')],
 'd-1-12a': [('河岸。无雨','shenci-night-mooring')],
 'd-1-11': [('你回家的时候，衣服湿透了','hut')],
 'd-1-12g': [('河岸。天将明未明','shenci-valley-dawn')],
 'r-C-5': [('夜色像一匹','shenci-curtain-altar')],
 'k-C-1': [('逃民说不清楚','shenci-displaced-road')],
 'k-C-4': [('舟被推下河','shenci-wuyang-procession')],
 'k-C-6': [('最后一个上船的','shenci-wuyang-departure'),('船上的头一夜','shenci-night-mooring')],
 'k-E-4': [('那屋子，全用水草香草编成','shenci-underwater-eaves')],
 'k-F-5': [('天，真的开了','shenci-sky-opening'),('然后，所有的蓝','shenci-sky-golden')],
 'k-F-6': [('青蓝，褪成灰白','shenci-valley-dawn'),('只剩那碗粥','cg-modern-cold-porridge')],
 'm-2-4': [('她照旧坐在旁边','classroom-day')],
 'm-4-1': [('有一家琴行','alley'),('教历史的年轻老师','classroom-day'),('巷子口，修伞摊','alley')],
 'm-4-2': [('教室、办公室','classroom-day'),('办公室的空调吹得很冷','modern-office')],
 'm-4-3': [('回家的路上，两个人没说话','alley')],
 'm-4-4': [
     ('把手里另一瓶没开封的水塞','cg-modern-hike-tang'),
     ('说完，她转身往上走','modern-mountain-path'),
 ],
 'm-4-5': [
     ('停下来擦汗','cg-modern-hike-terrace'),
     ('啪地磕在栏杆','cg-modern-hike-rail'),
     ('一只手比你先到','cg-modern-hike-pickup'),
     ('手的主人笑得张扬','cg-modern-hike-return'),
     ('她把水塞进你手里','cg-modern-hike-held'),
     ('你一个人掉队啦','cg-modern-hike-invitation'),
     ('你握住那瓶水','cg-modern-hike-held'),
     ('她走在前面','cg-modern-hike-lookback'),
 ],
}
# Each row begins a new reading section, not a new scene or save namespace.
SECTIONS = {
 'd-1-5': [('酒摊在陶摊斜对面','酒摊'),('两只鸡谁也不理','看鸡'),('盐摊是两只蒲包','买盐'),('你想起你妈。超市里','盐价与家里'),('这种事听多了不好','街边闲话'),('笑到一半，脸上僵住了','街上唱的诗'),('街尾有一座小神祠','街尾小祠')],
 'd-1-8': [('台下站了二十来个人','陆祭'),('你再仔细看。这颗牙','缺角的兽牙'),('念一句我听听','教念招魂'),('你抱着空手回去','夜里的木匣'),('一块玉。青白色','残玉和木鸟')],
 'd-1-9': [('喊一个，停一停，听','喊名'),('混在人群里','火的另一边'),('后颈一凉','朔夜来客'),('铃舌贴着铃壁','铃停了'),('都回去吧','火散之后')],
 'd-1-12z': [('把那件小童衣摊在膝上','灶火与童衣'),('你数着数着，睡着了','半夜叩门'),('你看了一眼里屋','重到河岸'),('把这句转述给屈衡','隔水问郢都'),('楚国……没了？','未了的政事'),('他说，他还有政事未了','天将亮')],
 'r-C-1a': [('令尹府 · 夜宴','令尹府 · 夜宴'),('太祝府 · 问卜','太祝府 · 问卜'),('老将府 · 旧甲','老将府 · 旧甲'),('清流老臣府 · 残简','老臣府 · 残简'),('外戚府 · 金玉','外戚府 · 金玉'),('主战武将府 · 磨剑','武将府 · 磨剑'),('骑墙派府 · 算盘','文臣府 · 算盘'),('主和派府 · 请降书','主和派府 · 请降书')],
 'm-4-4': [('周六一早，山脚下集合','山脚集合'),('岔路口到了','山路分岔')],
}
BASE_CHAPTER = {
 'd': ['清晨与校园','古图与穿越','选巫','古镇与陆祭','河畔','天问七夜'],
 'r': {'A':'入局 · 五日至寿春','B':'装疯 · 身份','C':'戏中戏 · 验罪','D':'城破 · 决断','E1':'哀郢','E2':'随队','G1':'国殇','G2':'问名','G':'国殇过场','L':'离骚','S':'涉江','H':'怀沙','R':'礼魂','F':'渔父','O':'橘颂'},
 'k': {'A':'入班 · 巫童','B':'巡游 · 扮神','C':'放舟 · 送行','D':'大风 · 磨难','E':'诸神 · 青蓝','F':'幻境','G':'浅滩 · 风过','X':'屋檐','N':'小衣','Y':'云里的水声','J':'折桨','S':'半截笛','M':'册外的名字','T':'不肯停的太阳','H':'九条河','L':'传芭','Z':'远游'},
}
SCORE = {
 'd-0-1': [('闹钟骤响','paper-note','room','alarm')],
 'd-0-3': [('别乱开玩笑','paper-note','street',''),('几乎夜夜梦见同一条船','under-current','street','')],
 'd-0-4': [('精准、耐心','playful','room',''),('周末叫你家长','paper-note','room','')],
 'd-0-6': [('梦里多水','under-current','street',''),('可算找着你了','playful','street',''),('有缘再说','paper-note','street','')],
 'd-0-8': [('你去买彩票吧','playful','room','')],
 'd-0-10': [('笔尖沿淡痕落下','under-current','underwater','electric')],
 'd-0-11': [('走廊空着','under-current','underwater','heartbeat'),('门外是一片','under-current','marsh','splash')],
 'd-1-2': [('缶。笙。鼓。铃声','ritual','palace','ritual-drum')],
 'd-1-5': [('石板街从堤下一直铺到镇里','hearth','wind','steps'),('两只鸡谁也不理','playful','wind',''),('盐摊是两只蒲包','hearth','wind',''),('笑到一半，脸上僵住了','old-jade','wind','')],
 'd-1-8': [('老觋敲缶','ritual','hearth','ritual-drum'),('墙角的木匣响了一声','old-jade','hearth','wood-latch')],
 'd-1-9': [('老觋站在火边','ritual','hearth','triple-bell'),('笑声没有接上','silence','river','flute')],
 'd-1-11': [('河岸。雨夜','chu-night-river','rain',''),('你回家的时候，衣服湿透了','chu-night-river','hearth','')],
 'd-1-12z': [('睡到半夜','under-current','night',''),('到了河边','chu-night-river','river',''),('楚国……没了？','silence','river','')],
 'r-C-5': [('夜色像一匹','ritual','palace','ritual-drum')],
 'r-C-11': [('你远远望着她','small-goodbyes','wind','')],
 'k-A-2': [('芈不会说话。他给每人吹','playful','night','flute')],
 'k-B-7': [('新郎急了','playful','hearth',''),('那天散了席','small-goodbyes','hearth','')],
 'k-C-6': [('船离岸了','last-flute','river','oar'),('船上的头一夜','silence','river','')],
 'k-D-5': [('风从囊里冲出来','chu-storm','wind','string-snap'),('帆先撕了','chu-storm','rain','hull')],
 'k-D-6': [('风大得睁不开眼','chu-storm','rain',''),('一个巨浪打来','chu-storm','rain','splash'),('不知过了多久，风，忽然小了','silence','river','')],
 'k-D-7': [('六个人坐在空舱','silence','river','')],
 'k-F-5': [('然后，所有的蓝','silence','wind','')],
 'k-G-1': [('那只小舟很轻','silence','none','')],
 'm-2-1': [('下课铃响了','silence','room','school-bell')],
 'm-4-4': [('周六一早，山脚下集合','playful','wind',''),('岔路口到了','modern-ascent','wind','')],
 'm-4-5': [
     ('停下来擦汗','silence','wind',''),
     ('啪地磕在栏杆','silence','wind','bottle-rail'),
     ('她走在前面','shenci-lookback','wind',''),
 ],
}

def polish(scene):
    short=scene['id'][7:]; group,key=short.split('-',1); blocks=scene['blocks']
    prefix=key.split('-')[0]
    if group in ('r','k'):
        scene['chapter']=('王裔' if group=='r' else '昆仑')+' · '+BASE_CHAPTER[group].get(prefix,'支线')
    elif group=='d':
        if prefix=='0': idx=0 if int(key.split('-')[1])<7 else 1
        else: idx=2 if key in ('1-2','1-3','1-3a','1-4') else 3 if key in ('1-5','1-6','1-7','1-8') else 4 if key in ('1-9','1-10','1-11') else 5
        if key.startswith('1-13'):scene['chapter']='分路 · 马车与清晨'
        else:scene['chapter']=('序章' if prefix=='0' else '共通')+' · '+BASE_CHAPTER['d'][idx]
    def anchor(needle, tags=None):
        return next((i for i,b in enumerate(blocks) if (tags is None or b['tag'] in tags) and needle in ''.join(b['lines']) and 'when' not in b),None)
    for needle,art in ART.get(short,[]):
        i=anchor(needle);assert i is not None,(short,needle);blocks[i]['background']=art
    for i,b in enumerate(blocks):
        if b['tag']=='旁白' and b.get('pages')==[''] and b.get('blackout'):continue
        if b['tag']=='演出' and any(x in ''.join(b['lines']) for x in ('全黑。','黑场。水声渐弱')):
            b['blackout']=True
    for needle,music,amb,effect in SCORE.get(short,[]):
        i=anchor(needle);assert i is not None,(short,needle); b=blocks[i]; b['musicCue']=music;b['ambienceCue']=amb
        if effect:
            if b['tag'] in ('音效','背景','演出'):b['stageEffect']=effect
            else:b['effects']=[effect]
    manual={}
    for needle,label in SECTIONS.get(short,[]):
        i=anchor(needle);assert i is not None,(short,needle);manual[i]=label
    weight=lambda b: 1 if b['tag']=='选择' else len(b.get('pages',[]))
    def commit(start,end,title):
        if end<=start or not any(weight(b) for b in blocks[start:end]):return
        sections.append({'start':start,'title':title})
    sections=[]; hard=[0,*sorted(i for i in manual if i),len(blocks)]
    for st,end in zip(hard,hard[1:]):
        cuts=[st]; total=0; safe=[]
        for i in range(st,end):
            b=blocks[i]; total+=weight(b)
            if b['tag'] not in ('选择','背景','音效','立绘','演出') and not b.get('when') and b['tag']=='旁白' and total>=15:
                upcoming=blocks[i:i+4]
                if not any(x.get('when') or x['tag']=='选择' for x in upcoming): safe.append((i,total-weight(b)))
            if total>31 and safe:
                candidate,count=min(safe,key=lambda p:abs(p[1]-23)); cuts.append(candidate);total-=count;safe=[]
        if len(cuts)>1 and sum(weight(b) for b in blocks[cuts[-1]:end])<8 and sum(weight(b) for b in blocks[cuts[-2]:end])<=38:cuts.pop()
        for n,(a,c) in enumerate(zip(cuts,[*cuts[1:],end])):
            title=manual.get(st,scene['title'].split('·')[-1].strip());
            if n:title+=f' · {n+1}'
            commit(a,c,title)
    if len(sections)>1:scene['sections']=sections
