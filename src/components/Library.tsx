import { useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronRight, Download, Headphones, Image as ImageIcon, LockKeyhole, RotateCcw, Upload, X } from 'lucide-react';
import { asset, BACKGROUNDS, CHARACTERS, ENDINGS, ITEMS, portraitAsset, sourceDocument } from '../data/world';
import { canReturn, hasKunlun, hasRoyal, SCENES, sceneById } from '../engine';
import { BoneMark } from './Atmosphere';
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
    <nav className="route-nav" aria-label="路线">
      {ROUTES.map(item => <button key={item.key} className={`route-option ${route === item.key ? 'selected' : ''}`} onClick={() => setRoute(item.key)}>
        <span className="route-numeral">{item.number}</span><span><small>{item.subtitle}</small><strong>{item.name}</strong></span><ChevronRight size={16} strokeWidth={1} />
      </button>)}
      <div className="route-memory"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} small /><p>两条路，同一夜。<br />经历会留在卜骨里。</p></div>
    </nav>
    <div className="chapter-content">
      <div className="chapter-banner" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,24,29,.78), rgba(8,24,29,.1)),url("${asset(selected.art)}")` }}><span className="eyebrow">{selected.subtitle} · {visited.length} / {scenes.length} 场已读</span><h3>{selected.name}</h3><p>{route === 'return' && !canReturn(profile) ? '走过王裔与昆仑，两道裂纹才会相合。' : '循着记忆，回到已经走过的地方。'}</p></div>
      <div className="scene-list">
        {scenes.map((scene, index) => {
          const unlocked = profile.visited.includes(scene.id) || scene.id === '0-1';
          const [time, ...place] = scene.title.split('·');
          return <button className={`scene-row ${currentScene === scene.id ? 'scene-row--current' : ''}`} key={scene.id} disabled={!unlocked} onClick={() => onJump(scene.id)}>
            <span className="scene-row-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{place.join(' · ') || time}</strong><small>{place.length ? time : scene.chapter}</small></span><span className="scene-row-status">{!unlocked ? <LockKeyhole size={14} strokeWidth={1.2} /> : currentScene === scene.id ? '此刻' : <ArrowRight size={17} strokeWidth={1} />}</span>
          </button>;
        })}
      </div>
    </div>
  </div>;
}

export function CharactersView({ profile }: { profile: Profile }) {
  const [selected, setSelected] = useState(CHARACTERS[0]);
  const known = (key: string) => profile.met.includes(key) || key === 'shen';
  return <div className="characters-layout">
    <div className="character-list">
      <p className="quiet">记住一个名字，也记住一个人。</p>
      {CHARACTERS.map((character, index) => <button className={`character-row ${selected.key === character.key ? 'selected' : ''}`} key={character.key} disabled={!known(character.key)} onClick={() => setSelected(character)}>
        <span className="character-index">{String(index + 1).padStart(2, '0')}</span><span className="character-name">{known(character.key) ? character.name : '未相逢'}<small>{known(character.key) ? character.subtitle : '名字还在远方'}</small></span>{!known(character.key) ? <LockKeyhole size={13} /> : <span className="character-dot" style={{ background: character.color }} />}
      </button>)}
    </div>
    <div key={selected.key} className="character-detail" style={{ '--character-color': selected.color } as React.CSSProperties}>
      <div className="character-detail-orbit" aria-hidden="true" />
      <div className="character-detail-watermark" aria-hidden="true">{selected.name.at(-1)}</div>
      <img className="character-detail-portrait" src={portraitAsset(selected.key)} alt={selected.name} />
      <div className="character-biography"><span className="eyebrow">{selected.subtitle}</span><h3>{selected.name}<small>{selected.reading}</small></h3><p className="character-description">{selected.description}</p><blockquote>「 {selected.quote} 」</blockquote></div>
    </div>
  </div>;
}

export function GalleryView({ profile }: { profile: Profile }) {
  const entries = Object.entries(BACKGROUNDS).filter(([key]) => key !== 'classroom-day');
  const unlocked = entries.filter(([key]) => profile.art.includes(key));
  const [viewing, setViewing] = useState<string | null>(null);
  const [hideCaption, setHideCaption] = useState(false);
  const move = (step: number) => {
    const index = unlocked.findIndex(([key]) => key === viewing);
    setViewing(unlocked[(index + step + unlocked.length) % unlocked.length][0]);
  };
  if (viewing) return <div className={`gallery-viewer ${hideCaption ? 'gallery-viewer--clean' : ''}`}>
    <img className="gallery-full" src={asset(viewing)} alt={BACKGROUNDS[viewing].name} onClick={() => setHideCaption(!hideCaption)} />
    <button className="gallery-back icon-button" onClick={() => setViewing(null)} aria-label="返回绘卷"><ArrowLeft size={22} /></button>
    <div className="gallery-caption"><span className="eyebrow">{BACKGROUNDS[viewing].chapter}</span><h3>{BACKGROUNDS[viewing].name}</h3><p>{BACKGROUNDS[viewing].subtitle}</p><a href={asset(viewing)} download={`异托邦-${BACKGROUNDS[viewing].name}.webp`} className="text-button"><Download size={14} />收藏此景</a></div>
    {unlocked.length > 1 && <div className="gallery-arrows"><button className="icon-button" onClick={() => move(-1)} aria-label="上一张"><ArrowLeft size={20} /></button><span>{unlocked.findIndex(([key]) => key === viewing) + 1} / {unlocked.length}</span><button className="icon-button" onClick={() => move(1)} aria-label="下一张"><ArrowRight size={20} /></button></div>}
  </div>;
  return <div className="gallery-content"><div className="library-intro"><p>走过的山河，会在这里留下影子。</p><span>{unlocked.length} <i>/ {entries.length}</i></span></div><div className="gallery-grid">
    {entries.map(([key, info], index) => {
      const known = profile.art.includes(key);
      return <button key={key} className={`gallery-card ${!known ? 'gallery-card--locked' : ''}`} disabled={!known} onClick={() => setViewing(key)}>
        <div className="gallery-thumbnail">{known ? <img src={asset(`${key}-thumb`)} alt={info.name} loading="lazy" /> : <><span className="locked-landscape" /><LockKeyhole size={20} strokeWidth={1} /></>}<span className="gallery-index">{String(index + 1).padStart(2, '0')}</span>{known && <ImageIcon className="gallery-open" size={20} strokeWidth={1} />}</div><div className="gallery-card-title"><strong>{known ? info.name : '未至之境'}</strong><small>{known ? info.subtitle : '随旅途解锁'}</small></div>
      </button>;
    })}
  </div></div>;
}

export function JournalView({ state, profile }: { state: GameState | null; profile: Profile }) {
  const [tab, setTab] = useState<'bag' | 'endings'>('bag');
  return <div className="journal-content"><div className="tab-bar"><button className={tab === 'bag' ? 'selected' : ''} onClick={() => setTab('bag')}>随身之物</button><button className={tab === 'endings' ? 'selected' : ''} onClick={() => setTab('endings')}>命运的回声<span>{profile.endings.length} / 6</span></button></div>
    {tab === 'bag' ? <><div className="bone-panel"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} /><div><span className="eyebrow">卜骨上的两道裂纹</span><h3>{canReturn(profile) ? '来处与归处，终于相合。' : hasRoyal(profile) || hasKunlun(profile) ? '另一条路，仍在等你。' : '两条路，共享这一夜。'}</h3><p>记忆留存，物件归于此夜原样。<br />{profile.oldNames ? '那十根旧队名简，你已经问过。' : '有些名字，还没有被听见。'}</p><div className="bone-legend"><span className={hasRoyal(profile) ? 'is-lit' : ''}>第一道 · 王裔 {hasRoyal(profile) && <Check size={12} />}</span><span className={hasKunlun(profile) ? 'is-lit' : ''}>第二道 · 昆仑 {hasKunlun(profile) && <Check size={12} />}</span></div></div></div><h4 className="section-label">此刻，行囊里</h4><div className="inventory-grid">{state?.inventory.length ? state.inventory.map(id => ITEMS[id] && <div className="inventory-item" key={id}><span className="item-seal">{ITEMS[id].mark}</span><div><h4>{ITEMS[id].name}</h4><p>{ITEMS[id].detail}</p></div></div>) : <p className="empty-note">行囊还轻。先走到故事里去吧。</p>}</div></> : <div className="endings-grid">{Object.entries(ENDINGS).map(([id, ending]) => {
      const known = profile.endings.includes(id as keyof typeof ENDINGS);
      return <div className={`ending-card ${known ? 'ending-card--known' : ''}`} key={id} style={known ? { backgroundImage: `linear-gradient(0deg,rgba(6,21,26,.98),rgba(6,21,26,.4)),url("${asset(ending.background)}")` } : undefined}><span className="ending-roman">{ending.index}</span>{!known && <LockKeyhole className="ending-lock" size={17} strokeWidth={1} />}<small>{known ? ending.subtitle : '一页未尽的命运'}</small><h3>{known ? ending.title : '未闻'}</h3><p>{known ? ending.quote : '亲历之后，才能记住。'}</p></div>;
    })}</div>}
  </div>;
}

export function SaveView({ slots, state, initialMode, onSave, onLoad, onDelete, autosave }: { slots: (SaveSlot | null)[]; state: GameState | null; initialMode: 'save' | 'load'; onSave: (index: number) => void; onLoad: (state: GameState) => void; onDelete: (index: number) => void; autosave: GameState | null }) {
  const [mode, setMode] = useState(initialMode);
  const [overwrite, setOverwrite] = useState<number | null>(null);
  const date = (value: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  return <div className="save-content"><div className="tab-bar"><button className={mode === 'save' ? 'selected' : ''} onClick={() => { setMode('save'); setOverwrite(null); }}>留存此刻</button><button className={mode === 'load' ? 'selected' : ''} onClick={() => { setMode('load'); setOverwrite(null); }}>重续旧梦</button><span className="tab-description">{mode === 'save' ? '六处书签，留住六个瞬间。' : '路线记忆与已读记录会继续保留。'}</span></div>
    {mode === 'load' && autosave && <button className="autosave-row" onClick={() => onLoad(autosave)}><RotateCcw size={18} strokeWidth={1.3} /><span><strong>最近一次 · 自动留存</strong><small>{sceneById(autosave.sceneId).chapter} / {sceneById(autosave.sceneId).title}</small></span><ArrowRight size={18} strokeWidth={1} /></button>}
    <div className="save-grid">{slots.map((slot, index) => <div className={`save-slot ${slot ? 'save-slot--filled' : ''}`} key={index}>
      <button className="save-slot-main" disabled={mode === 'load' ? !slot : !state} onClick={() => { if (mode === 'load' && slot) onLoad(slot.state); else if (slot && overwrite !== index) setOverwrite(index); else { onSave(index); setOverwrite(null); } }}>
        <div className="save-slot-image">{slot ? <img src={asset(`${sceneById(slot.state.sceneId).background}-thumb`)} alt="" /> : <><span className="empty-slot-mark">卷</span><span>尚未落笔</span></>}<span className="save-slot-number">{String(index + 1).padStart(2, '0')}</span>{overwrite === index && <span className="save-overwrite">再点一次，替换这枚书签</span>}</div>
        <div className="save-slot-info"><strong>{slot ? sceneById(slot.state.sceneId).title : '空白书签'}</strong><small>{slot ? `${sceneById(slot.state.sceneId).chapter} · ${date(slot.savedAt)}` : mode === 'save' ? '在这里留下此刻' : '尚无可续的梦'}</small></div>
      </button>{slot && <button className="save-delete" onClick={() => onDelete(index)} aria-label={`移除书签 ${index + 1}`}><X size={13} /></button>}
    </div>)}</div><p className="save-footnote"><ArrowDownToLine size={13} /> 进度会自动保存在当前浏览器；也可在设置中导出存档。</p>
  </div>;
}

export function SettingsView({ settings, onChange, onExport, onImport, onReset, onMusic }: { settings: Settings; onChange: (settings: Settings) => void; onExport: () => void; onImport: (file: File) => void; onReset: () => void; onMusic: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const slider = (key: 'textSpeed' | 'autoDelay' | 'fontSize' | 'musicVolume' | 'ambienceVolume' | 'sfxVolume', label: string, min: number, max: number, description: string, unit: string) => <label className="setting-row"><span><strong>{label}</strong><small>{description}</small></span><div className="range-control"><input aria-label={label} type="range" min={min} max={max} value={settings[key]} style={{ '--range-fill': `${(settings[key] - min) / (max - min) * 100}%` } as React.CSSProperties} onChange={event => onChange({ ...settings, [key]: Number(event.target.value) })} /><output>{key === 'textSpeed' && settings[key] === 0 ? '即现' : `${settings[key]}${unit}`}</output></div></label>;
  const toggle = (key: 'reducedMotion' | 'showSprites' | 'muted', label: string, description: string) => <div className="setting-row"><span><strong>{label}</strong><small>{description}</small></span><button type="button" className={`toggle ${settings[key] ? 'toggle--on' : ''}`} role="switch" aria-checked={settings[key]} aria-label={label} onClick={() => onChange({ ...settings, [key]: !settings[key] })}><span /></button></div>;
  return <div className="settings-content"><div className="settings-columns"><section><h3 className="section-label">阅读 · 按自己的节奏</h3>{slider('textSpeed', '文字显现', 0, 65, '调到最左侧可立即显示全文', '字/秒')}{slider('autoDelay', '自动间隔', 2, 10, '全文显示后，再稍等一会儿', '秒')}{slider('fontSize', '正文字号', 17, 29, '把字调到舒服的大小', 'px')}{toggle('showSprites', '人物立绘', '让说话的人出现在画面中')}{toggle('reducedMotion', '减弱动态', '减少粒子、镜头移动与转场')}</section><section><h3 className="section-label">听觉 · 一条河的声音</h3>{slider('musicVolume', '配乐音量', 0, 100, '十一首原声，随旅途渐次展开', '%')}{slider('ambienceVolume', '环境音量', 0, 100, '水声、风声与灶边的微响', '%')}{slider('sfxVolume', '音效音量', 0, 100, '纸页、铜铃与脚下的一步', '%')}{toggle('muted', '静音', '暂时把声音放轻')}<button className="text-button settings-music-link" onClick={onMusic}><Headphones size={16} strokeWidth={1.2} />听水集 · 原声重听<ArrowRight size={14} /></button><div className="settings-note"><span>戴上耳机，</span><p>听水从远处来，也听人慢慢说话。</p></div></section></div><div className="settings-footer"><div className="settings-transfer"><button className="text-button" onClick={onExport}><Download size={15} />导出旅途</button><button className="text-button" onClick={() => input.current?.click()}><Upload size={15} />导入存档</button><input ref={input} type="file" accept="application/json,.json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ''; }} /></div><button className="text-button quiet" onClick={onReset}><RotateCcw size={14} />恢复阅读设置</button></div><div className="keyboard-reference"><span><kbd>Space</kbd> 继续 / 显示全文</span><span><kbd>H</kbd> 隐藏界面</span><span><kbd>F</kbd> 全屏</span><span><kbd>Esc</kbd> 菜单 / 返回</span></div></div>;
}

export function AboutView() {
  return <div className="about-content"><div className="about-title">异托邦<span>H E T E R O T O P I A</span></div><blockquote>「 看路，也看看走路的人。 」</blockquote><p>一部关于远行、记忆与回家的楚地奇幻视觉小说。</p><p>改编自《异托邦 V6 完整剧本》，保留序章、共通线、王裔线、昆仑线与归来的完整故事，以及跨路线记忆与四个王裔结局。</p><div className="about-stats"><span><strong>81</strong>场故事</span><span><strong>2</strong>条命运</span><span><strong>6</strong>页回声</span></div><p className="about-credit">原著剧本 · 用户提供<br />场景与人物美术 · 本机 Qwen-Image 2.1<br />原声配乐 · 本机 ACE-Step 1.5 / 十一首<br />环境与音效 · 本作程序化声音设计<br />中文字体 · Noto Serif SC / SIL Open Font License</p><a className="text-button" href={sourceDocument()} download="异托邦-V6-原著剧本.txt">阅读原著剧本 <ArrowRight size={15} /></a></div>;
}
