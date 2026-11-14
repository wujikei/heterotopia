import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, Download, Headphones, Image as ImageIcon, LockKeyhole, RotateCcw, Upload, X } from 'lucide-react';
import { asset, assetSources, BACKGROUNDS, CHARACTERS, ENDINGS, ITEMS, portraitFace, sourceDocument } from '../data/world';
import { portraitName } from '../assets';
import { ArtImage } from './ArtImage';
import { useModalBack } from './Modal';
import { sound } from '../audio';
import { CGS, cgUnlocked } from '../data/cgs';
import { AVAILABLE_EXTRAS, EXTRAS } from '../data/extras';
import { canReturn, hasKunlun, hasRoyal, SCENES, sceneById } from '../engine';
import { isStoryReady, loadStory } from '../story';
import { BoneMark } from './Atmosphere';
import { slotPresentation } from '../savePresentation';
import type { GameState, Profile, Route, SaveSlot, Settings } from '../types';

const ROUTES: { key: Route; name: string; subtitle: string; art: string; number: string }[] = [
  { key: 'prologue', name: '水声之前', subtitle: '序章', art: 'school', number: '序' },
  { key: 'common', name: '借来的一口气', subtitle: '共通线', art: 'hut', number: '壹' },
  { key: 'royal', name: '旧玉与故人', subtitle: '王裔线', art: 'palace', number: '贰' },
  { key: 'kunlun', name: '山河未尽', subtitle: '昆仑线', art: 'mountain', number: '叁' },
  { key: 'return', name: '光河与归来', subtitle: '终章', art: 'light-river', number: '归' },
];

export function ChaptersView({ profile, currentScene, onJump }: { profile: Profile; currentScene?: string; onJump: (id: string) => void }) {
  const [route, setRoute] = useState<Route>(currentScene ? sceneById(currentScene).route : 'prologue');
  const selected = ROUTES.find(item => item.key === route)!;
  const scenes = SCENES.filter(scene => scene.route === route);
  const visited = scenes.filter(scene => profile.visited.includes(scene.id));
  return <div className="chapter-layout">
    <nav className="route-river" aria-label="路线">
      <svg className="route-river-line" viewBox="0 0 40 500" preserveAspectRatio="none" aria-hidden="true"><path d="M20 0C34 50 6 80 20 125S34 200 20 250 6 330 20 375 34 450 20 500" /></svg>
      {ROUTES.map(item => {
        const all = SCENES.filter(scene => scene.route === item.key);
        const seen = all.filter(scene => profile.visited.includes(scene.id)).length;
        return <button key={item.key} className={`route-stop ${route === item.key ? 'selected' : ''} ${seen ? '' : 'route-stop--unseen'}`} onClick={() => setRoute(item.key)} aria-pressed={route === item.key}>
          <span className="route-node" aria-hidden="true">{item.number}</span>
          <span className="route-copy"><small>{item.subtitle}</small><strong>{item.name}</strong><em>{seen ? `${seen} / ${all.length} 场` : '尚未行至'}</em></span>
        </button>;
      })}
      <div className="route-memory"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} small /><p>两条路，同一夜。<br />经历会留在卜骨里。</p></div>
    </nav>
    <div className="chapter-content">
      <div className="chapter-banner" key={route}>
        <ArtImage className="chapter-banner-art" name={selected.art} alt="" />
        <div className="chapter-banner-copy"><span className="chapter-banner-numeral" aria-hidden="true">{selected.number}</span><div><span className="eyebrow">{selected.subtitle} · 已读 {visited.length} / {scenes.length} 场</span><h3>{selected.name}</h3><p>{route === 'return' && !canReturn(profile) ? '走过王裔与昆仑，两道裂纹才会相合。' : '循着记忆，回到已经走过的地方。'}</p></div></div>
        <div className="chapter-progress" aria-hidden="true"><i style={{ width: `${scenes.length ? visited.length / scenes.length * 100 : 0}%` }} /></div>
      </div>
      <ol className="scene-list">
        {scenes.map((scene, index) => {
          const unlocked = profile.visited.includes(scene.id) || scene.id === '0-1';
          const current = currentScene === scene.id;
          const [time, ...place] = scene.title.split('·');
          return <li key={scene.id}><button className={`scene-row ${current ? 'scene-row--current' : ''} ${unlocked ? '' : 'scene-row--locked'}`} disabled={!unlocked} onClick={() => onJump(scene.id)}>
            <span className="scene-row-node" aria-hidden="true" /><span className="scene-row-index">{String(index + 1).padStart(2, '0')}</span><span className="scene-row-copy"><strong>{place.join(' · ') || time}</strong><small>{place.length ? time : scene.chapter}</small></span><span className="scene-row-status">{!unlocked ? '未至' : current ? '此刻' : <>重游<ArrowRight size={15} strokeWidth={1.2} /></>}</span>
          </button></li>;
        })}
      </ol>
    </div>
  </div>;
}

export function CharactersView({ profile }: { profile: Profile }) {
  const [selected, setSelected] = useState(CHARACTERS[0]);
  const [storyReady, setStoryReady] = useState(isStoryReady);
  useEffect(() => {
    if (storyReady || !profile.read.length) return;
    let active = true;
    void loadStory().then(() => { if (active) setStoryReady(true); }).catch(() => {});
    return () => { active = false; };
  }, [storyReady, profile.read.length]);
  const characters = [...CHARACTERS, ...EXTRAS.filter(character => AVAILABLE_EXTRAS.has(character.key))];
  const heardExtras = useMemo(() => {
    const readBlocks = new Set(profile.read.map(id => id.slice(0, id.lastIndexOf(':'))));
    const heard = new Set<string>();
    for (const scene of SCENES) scene.blocks.forEach((block, index) => {
      if (!readBlocks.has(`${scene.id}:${index}`)) return;
      const speaker = block.tag.split('·')[0];
      const character = EXTRAS.find(extra => extra.name === speaker || (extra.key === 'daoist' && speaker === '邋遢道士'));
      if (character) heard.add(character.key);
    });
    return heard;
  }, [profile.read, storyReady]);
  const known = (key: string) => profile.met.includes(key) || key === 'shen' || heardExtras.has(key);
  const count = characters.filter(character => known(character.key)).length;
  return <div className="characters-layout">
    <div className="character-gallery">
      <p className="character-hint">记住一个名字，也记住一个人。<span>{count}<i> / {characters.length}</i></span></p>
      <div className="character-grid">{characters.map((character, index) => {
        const met = known(character.key);
        return <button className={`character-card ${selected.key === character.key ? 'selected' : ''} ${met ? '' : 'character-card--locked'}`} key={character.key} data-character={character.key} disabled={!met} onClick={() => setSelected(character)} aria-pressed={selected.key === character.key} aria-label={met ? `${character.name}，${character.subtitle}` : `第 ${index + 1} 位，尚未相逢`}>
          <span className="character-thumb" style={{ '--character-color': character.color } as React.CSSProperties}><img src={portraitFace(character.key)} alt="" loading="lazy" />{!met && <span className="character-unknown" aria-hidden="true">？</span>}</span>
          <span className="character-card-name">{met ? character.name : '未相逢'}</span>
        </button>;
      })}</div>
    </div>
    <article key={selected.key} className="character-scroll" style={{ '--character-color': selected.color } as React.CSSProperties}>
      <div className="character-portrait-frame"><span className="character-detail-watermark" aria-hidden="true">{selected.name.at(-1)}</span><ArtImage className="character-detail-portrait" name={portraitName(selected.key)} alt={selected.name} /></div>
      <div className="character-biography">
        <span className="eyebrow">{selected.subtitle}</span>
        <h3>{selected.name}{selected.reading && <small>{selected.reading}</small>}</h3>
        <p className="character-description">{selected.description}</p>
        <blockquote>{selected.quote}</blockquote>
      </div>
    </article>
  </div>;
}

export function GalleryView({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<'landscapes' | 'cgs'>('landscapes');
  const entries = tab === 'landscapes'
    ? Object.entries(BACKGROUNDS).filter(([key]) => key !== 'classroom-day').map(([key, info]) => ({ key, art: key, thumbnail: `${key}-thumb`, ...info, known: profile.art.includes(key) }))
    : CGS.filter(cg => !!cg.file).map(cg => ({ key: cg.id, art: cg.file, thumbnail: cg.thumbnail || cg.file, name: cg.title, subtitle: cg.caption, chapter: '旅途留影', known: cgUnlocked(cg, profile) }));
  const unlocked = entries.filter(entry => entry.known);
  const [viewing, setViewing] = useState<string | null>(null);
  const [hideCaption, setHideCaption] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const move = (step: number) => {
    if (unlocked.length < 2) return;
    const index = unlocked.findIndex(entry => entry.key === viewing);
    setViewing(unlocked[(index + step + unlocked.length) % unlocked.length].key);
  };
  useModalBack(() => {
    if (!viewing) return false;
    if (hideCaption) setHideCaption(false);
    else setViewing(null);
    return true;
  });
  useEffect(() => {
    if (!viewing) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); event.stopPropagation();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, [viewing, unlocked.map(entry => entry.key).join(',')]);
  const viewed = unlocked.find(entry => entry.key === viewing);
  if (viewed) return <div className={`gallery-viewer ${hideCaption ? 'gallery-viewer--clean' : ''}`} data-gallery-art={viewed.art} style={hideCaption ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: 30 } : undefined}>
    <button className="gallery-art-toggle" aria-label={hideCaption ? '退出沉浸看图' : '沉浸看图'} onClick={() => {
      if (swiped.current) { swiped.current = false; return; }
      setHideCaption(value => !value);
    }} onPointerDown={event => {
      pointer.current = { x: event.clientX, y: event.clientY }; swiped.current = false;
    }} onPointerUp={event => {
      if (!pointer.current) return;
      const dx = event.clientX - pointer.current.x, dy = event.clientY - pointer.current.y;
      pointer.current = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; move(dx < 0 ? 1 : -1); }
    }} onPointerCancel={() => { pointer.current = null; }}>
      <ArtImage className="gallery-full" name={viewed.art} responsive={false} alt={viewed.name} draggable={false} />
    </button>
    <button className="gallery-back icon-button" onClick={() => setViewing(null)} aria-label="返回绘卷"><X size={19} /><span>返回</span></button>
    <div className="gallery-caption"><span className="eyebrow">{viewed.chapter}</span><h3>{viewed.name}</h3><p>{viewed.subtitle}</p><a href={assetSources(viewed.art).webp} download={`异托邦-${viewed.name}.webp`} className="text-button"><Download size={14} />下载此景</a><small className="gallery-gesture-hint">轻触画面沉浸观看 · 左右滑动换图</small></div>
    {unlocked.length > 1 && <div className="gallery-arrows"><button className="icon-button" onClick={() => move(-1)} aria-label="上一张"><ArrowLeft size={20} /></button><span>{unlocked.findIndex(entry => entry.key === viewing) + 1} / {unlocked.length}</span><button className="icon-button" onClick={() => move(1)} aria-label="下一张"><ArrowRight size={20} /></button></div>}
  </div>;
  return <div className="gallery-content"><div className="tab-bar gallery-tabs" role="tablist" aria-label="绘卷分类"><button role="tab" aria-selected={tab === 'landscapes'} className={tab === 'landscapes' ? 'selected' : ''} onClick={() => setTab('landscapes')}>山河</button><button role="tab" aria-selected={tab === 'cgs'} className={tab === 'cgs' ? 'selected' : ''} onClick={() => setTab('cgs')}>留影 · CG</button></div><div className="library-intro"><p>{tab === 'landscapes' ? '走过的山河，会在这里留下影子。' : '亲历过的瞬间，才会在卷中展开。'}</p><span>{unlocked.length} <i>/ {entries.length}</i></span></div>{!entries.length && <p className="empty-note">下一程的留影，还在水声里。</p>}<div className="gallery-grid">
    {entries.map((info, index) => {
      const { key, known } = info;
      return <button key={key} className={`gallery-card ${!known ? 'gallery-card--locked' : ''}`} disabled={!known} onClick={() => { setViewing(key); setHideCaption(false); }}>
        <div className="gallery-thumbnail">{known ? <ArtImage name={info.thumbnail} alt={info.name} loading="lazy" /> : <><ArtImage className="locked-glimpse" name={info.thumbnail} alt="" loading="lazy" aria-hidden="true" /><span className="locked-landscape" /><LockKeyhole size={20} strokeWidth={1} /></>}<span className="gallery-index">{String(index + 1).padStart(2, '0')}</span>{known && <ImageIcon className="gallery-open" size={20} strokeWidth={1} />}</div><div className="gallery-card-title"><strong>{known ? info.name : '未至之境'}</strong><small>{known ? info.subtitle : '随旅途解锁'}</small></div>
      </button>;
    })}
  </div></div>;
}

export function JournalView({ state, profile }: { state: GameState | null; profile: Profile }) {
  const [tab, setTab] = useState<'bag' | 'endings'>('bag');
  const items = (state?.inventory ?? []).filter(id => ITEMS[id]);
  const ghosts = Math.max(0, 4 - items.length);
  return <div className="journal-content">
    <div className="notebook">
      <div className="tab-bar notebook-tabs" role="tablist"><button role="tab" aria-selected={tab === 'bag'} className={tab === 'bag' ? 'selected' : ''} onClick={() => setTab('bag')}>随身之物</button><button role="tab" aria-selected={tab === 'endings'} className={tab === 'endings' ? 'selected' : ''} onClick={() => setTab('endings')}>命运的回声<span>{profile.endings.length} / 6</span></button></div>
      <div className="notebook-page" key={tab}>
        {tab === 'bag' ? <>
          <div className="bone-panel"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} /><div><span className="eyebrow">卜骨上的两道裂纹</span><h3>{canReturn(profile) ? '来处与归处，终于相合。' : hasRoyal(profile) || hasKunlun(profile) ? '另一条路，仍在等你。' : '两条路，共享这一夜。'}</h3><p>记忆留存，物件归于此夜原样。<br />{profile.oldNames ? '那十根旧队名简，你已经问过。' : '有些名字，还没有被听见。'}</p><div className="bone-legend"><span className={hasRoyal(profile) ? 'is-lit' : ''}>第一道 · 王裔 {hasRoyal(profile) && <Check size={12} />}</span><span className={hasKunlun(profile) ? 'is-lit' : ''}>第二道 · 昆仑 {hasKunlun(profile) && <Check size={12} />}</span></div></div></div>
          <h4 className="section-label">此刻，行囊里</h4>
          <div className="inventory-grid">
            {items.map(id => <div className="inventory-item" key={id}><span className="item-seal">{ITEMS[id].mark}</span><div><h4>{ITEMS[id].name}</h4><p>{ITEMS[id].detail}</p></div></div>)}
            {Array.from({ length: ghosts }, (_, i) => <div className="inventory-item inventory-item--ghost" key={`ghost-${i}`} aria-hidden="true"><span className="item-seal">{['图', '玉', '简', '笛'][i % 4]}</span><div><h4>尚未拾得</h4><p>{items.length || i ? '路上还会遇见。' : '行囊还轻。先走到故事里去吧。'}</p></div></div>)}
          </div>
          {!items.length && <p className="empty-note">行囊还轻。先走到故事里去吧。</p>}
        </> : <div className="endings-grid">{Object.entries(ENDINGS).map(([id, ending]) => {
          const known = profile.endings.includes(id as keyof typeof ENDINGS);
          return <div className={`ending-card ${known ? 'ending-card--known' : ''}`} key={id} style={{ '--glimpse': `url("${asset(`${ending.background}-thumb`)}")` } as React.CSSProperties}><span className="ending-roman" aria-hidden="true">{ending.index}</span>{!known && <LockKeyhole className="ending-lock" size={16} strokeWidth={1.2} />}<small>{known ? ending.subtitle : '一页未尽的命运'}</small><h3>{known ? ending.title : '未闻'}</h3><p>{known ? ending.quote : '亲历之后，才能记住。'}</p></div>;
        })}</div>}
      </div>
    </div>
  </div>;
}

export function SaveView({ slots, state, profile, initialMode, onSave, onLoad, onDelete, autosave }: { slots: (SaveSlot | null)[]; state: GameState | null; profile: Profile; initialMode: 'save' | 'load'; onSave: (index: number) => void; onLoad: (state: GameState) => void; onDelete: (index: number) => void; autosave: GameState | null }) {
  const [mode, setMode] = useState(initialMode);
  const [confirmation, setConfirmation] = useState<{ index: number; action: 'overwrite' | 'delete' } | null>(null);
  const date = (value: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const cards = slots.map(slot => slot ? slotPresentation(slot.state, profile) : null);
  const recent = autosave ? slotPresentation(autosave, profile) : null;
  return <div className="save-content" onPointerDownCapture={event => {
    if (confirmation && event.target instanceof Element && event.target.closest('.save-slot')?.getAttribute('data-slot') !== String(confirmation.index)) setConfirmation(null);
  }} onBlurCapture={event => {
    if (confirmation && event.relatedTarget instanceof Element && !event.relatedTarget.closest(`[data-slot="${confirmation.index}"]`)) setConfirmation(null);
  }}><div className="tab-bar"><button className={mode === 'save' ? 'selected' : ''} onClick={() => { setMode('save'); setConfirmation(null); }}>留存此刻</button><button className={mode === 'load' ? 'selected' : ''} onClick={() => { setMode('load'); setConfirmation(null); }}>重续旧梦</button><span className="tab-description">{mode === 'save' ? '六处书签，留住六个瞬间。' : '路线记忆与已读记录会继续保留。'}</span></div>
    {mode === 'load' && autosave && recent && <button className="autosave-row" onClick={() => onLoad(autosave)}><RotateCcw size={18} strokeWidth={1.3} /><span><strong>最近一次 · 自动留存</strong><small>{recent.chapter} / {recent.title}</small></span><ArrowRight size={18} strokeWidth={1} /></button>}
    <div className="save-grid">{slots.map((slot, index) => <div className={`save-slot ${slot ? 'save-slot--filled' : ''} ${confirmation?.index === index ? 'save-slot--confirm' : ''}`} key={index} data-slot={index}><span className="save-tassel" aria-hidden="true" />
      <button className="save-slot-main" disabled={mode === 'load' ? !slot : !state} onClick={() => { if (mode === 'load' && slot) onLoad(slot.state); else if (slot && !(confirmation?.index === index && confirmation.action === 'overwrite')) setConfirmation({ index, action: 'overwrite' }); else { onSave(index); setConfirmation(null); } }}>
        <div className="save-slot-image">{slot ? <img src={asset(`${cards[index]!.background}-thumb`)} alt="" /> : <><span className="empty-slot-mark">卷</span><span>尚未落笔</span></>}<span className="save-slot-number">{String(index + 1).padStart(2, '0')}</span>{confirmation?.index === index && <span className="save-overwrite" id={`save-confirm-${index}`} role="status">{confirmation.action === 'delete' ? '再点一次叉号，移除这枚书签' : '再点一次，替换这枚书签'}</span>}</div>
        <div className="save-slot-info"><strong>{slot ? cards[index]!.title : '空白书签'}</strong><small>{slot ? `${cards[index]!.chapter} · ${date(slot.savedAt)}` : mode === 'save' ? '在这里留下此刻' : '尚无可续的梦'}</small>{cards[index]?.excerpt && <p className="save-slot-excerpt">{cards[index]!.excerpt}</p>}</div>
      </button>{slot && <button className={`save-delete ${confirmation?.index === index && confirmation.action === 'delete' ? 'save-delete--confirm' : ''}`} onClick={() => {
        if (confirmation?.index === index && confirmation.action === 'delete') { onDelete(index); setConfirmation(null); }
        else setConfirmation({ index, action: 'delete' });
      }} aria-label={`${confirmation?.index === index && confirmation.action === 'delete' ? '确认' : ''}移除书签 ${index + 1}`} aria-describedby={confirmation?.index === index ? `save-confirm-${index}` : undefined}><X size={16} /></button>}
    </div>)}</div><p className="save-footnote"><ArrowDownToLine size={13} /> 进度会自动保存在当前浏览器；也可在设置中导出存档。</p>
  </div>;
}

export function SettingsView({ settings, onChange, onExport, onImport, onReset, onMusic }: { settings: Settings; onChange: (settings: Settings) => void; onExport: () => void; onImport: (file: File) => void; onReset: () => void; onMusic: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const slider = (key: 'textSpeed' | 'autoDelay' | 'fontSize' | 'musicVolume' | 'ambienceVolume' | 'sfxVolume', label: string, min: number, max: number, description: string, unit: string) => <label className="setting-row"><span><strong>{label}</strong><small>{description}</small></span><div className="range-control"><input aria-label={label} type="range" min={min} max={max} value={settings[key]} style={{ '--range-fill': `${(settings[key] - min) / (max - min) * 100}%` } as React.CSSProperties} onChange={event => onChange({ ...settings, [key]: Number(event.target.value) })} onPointerUp={() => { if (key === 'sfxVolume') sound.click('preview'); }} onKeyUp={event => { if (key === 'sfxVolume' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) sound.click('preview'); }} /><output>{key === 'textSpeed' && settings[key] === 0 ? '即现' : key === 'autoDelay' ? settings[key] <= 3 ? '较快' : settings[key] >= 8 ? '较慢' : '适中' : `${settings[key]}${unit}`}</output></div></label>;
  const toggle = (key: 'reducedMotion' | 'showSprites' | 'muted' | 'lightweight' | 'autoAfterChoice', label: string, description: string) => <div className="setting-row"><span><strong>{label}</strong><small>{description}</small></span><button type="button" className={`toggle ${settings[key] ? 'toggle--on' : ''}`} role="switch" aria-checked={settings[key]} aria-label={label} onClick={() => { sound.click('toggle'); onChange({ ...settings, [key]: !settings[key] }); }}><span /></button></div>;
  return <div className="settings-content"><div className="settings-columns"><section><h3 className="section-label">阅读 · 按自己的节奏</h3>{slider('textSpeed', '文字显现', 0, 65, '调到最左侧可立即显示全文', '字/秒')}{slider('autoDelay', '自动节奏', 2, 10, '快 ↔ 慢，长句会多留一点时间', '')}{toggle('autoAfterChoice', '选择后继续自动阅读', '作出选择后，沿用之前的自动阅读节奏')}{slider('fontSize', '正文字号', 17, 29, '把字调到舒服的大小', 'px')}{toggle('showSprites', '人物立绘', '让说话的人出现在画面中')}{toggle('reducedMotion', '减弱动态', '减少粒子、镜头移动与转场')}{toggle('lightweight', '轻量模式', '开启使用较小背景；关闭呈现原画细节')}</section><section><h3 className="section-label">听觉 · 一条河的声音</h3>{slider('musicVolume', '配乐音量', 0, 100, '十一首原声，随旅途渐次展开', '%')}{slider('ambienceVolume', '环境音量', 0, 100, '水声、风声与灶边的微响', '%')}{slider('sfxVolume', '音效音量', 0, 100, '纸页、铜铃与脚下的一步', '%')}{toggle('muted', '静音', '暂时把声音放轻')}<button className="text-button settings-music-link" onClick={onMusic}><Headphones size={16} strokeWidth={1.2} />听水集 · 原声重听<ArrowRight size={14} /></button><div className="settings-note"><span>戴上耳机，</span><p>听水从远处来，也听人慢慢说话。</p></div></section></div><div className="settings-footer"><div className="settings-transfer"><button className="text-button" onClick={onExport}><Download size={15} />导出旅途</button><button className="text-button" onClick={() => input.current?.click()}><Upload size={15} />导入存档</button><input ref={input} type="file" accept="application/json,.json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ''; }} /></div><button className="text-button quiet" onClick={onReset}><RotateCcw size={14} />恢复阅读设置</button></div><div className="keyboard-reference" aria-label="阅读快捷键"><span><kbd>Space</kbd> / <kbd>Enter</kbd> 继续 / 显示全文</span><span><kbd>←</kbd> / <kbd>PageUp</kbd> 回看 / 上滑</span><span><kbd>A</kbd> 自动阅读</span><span><kbd>Ctrl</kbd> 按住跳过已读</span><span><kbd>1–6</kbd> 选择纸签</span><span><kbd>S</kbd> 存档 / <kbd>L</kbd> 读档</span><span><kbd>H</kbd> 隐藏界面</span><span><kbd>F</kbd> 全屏</span><span><kbd>Esc</kbd> 菜单 / 逐层返回</span></div></div>;
}

export function AboutView() {
  const credits: [string, string][] = [['原著剧本', '用户提供'], ['场景与人物美术', '本机 Qwen-Image 2.1'], ['原声配乐', '本机 ACE-Step 1.5 · 十一首'], ['环境与音效', '本作程序化声音设计'], ['中文字体', 'Noto Serif SC · 霞鹜文楷 LXGW WenKai'], ['字体授权', 'SIL Open Font License']];
  return <div className="about-content">
    <div className="about-hero"><span className="about-seal" aria-hidden="true">异托</span><div className="about-title">异托邦</div></div>
    <blockquote>看路，也看看走路的人。</blockquote>
    <p>一部关于远行、记忆与回家的楚地奇幻视觉小说。</p>
    <p>改编自《异托邦 V6 完整剧本》，保留序章、共通线、王裔线、昆仑线与归来的完整故事，以及跨路线记忆与四个王裔结局。</p>
    <div className="about-stats"><span><strong>81</strong>场故事</span><span><strong>2</strong>条命运</span><span><strong>6</strong>页回声</span></div>
    <dl className="about-credit">{credits.map(([role, name]) => <div key={role}><dt>{role}</dt><dd>{name}</dd></div>)}</dl>
    <a className="text-button about-source" href={sourceDocument()} download="异托邦-V6-原著剧本.txt">阅读原著剧本 <ArrowRight size={15} /></a>
  </div>;
}

