import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, CircleHelp, Feather, Pause, Play, SkipForward, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { sound } from './audio';
import { Atmosphere, BoatMark, BoneMark, SceneArt } from './components/Atmosphere';
import { Modal } from './components/Modal';
import { InkBacklog, InkBell, InkBookmark, InkBrush, InkClosedEye, InkDrop, InkFigure, InkFlow, InkFrame, InkLamp, InkMenu, InkMore, InkMountain, InkPath, InkReturn, InkScroll, InkWind } from './components/InkIcons';
import { MusicRoom } from './components/MusicRoom';
import { AboutView, ChaptersView, CharactersView, GalleryView, JournalView, SaveView, SettingsView } from './components/Library';
import { asset, BACKGROUNDS, characterFor, ENDINGS, portraitAsset } from './data/world';
import { advance, canReturn, choose, compileScene, completeEnding, continueEnding, currentBeat, hasKunlun, hasRoyal, newGame, newProfile, recordProgress, revisitScene, SCENES, sceneById } from './engine';
import { DEFAULT_SETTINGS, exportSave, loadAutosave, loadProfile, loadSettings, loadSlots, persist, validState } from './storage';
import { scoreFrame } from './score';
import type { GameState, Profile, SaveSlot, Settings } from './types';

type ModalName = 'chapters' | 'characters' | 'gallery' | 'journal' | 'settings' | 'saves' | 'history' | 'menu' | 'about' | 'music';
type Intro = { chapter: string; title: string; subtitle: string };

const ROUTE_NAMES = { prologue: '序章', common: '共通线', royal: '王裔线', kunlun: '昆仑线', return: '归来' };
const LIBRARY: { name: ModalName; text: string; note: string; icon: typeof InkPath }[] = [
  { name: 'chapters', text: '行迹', note: '走过的水路', icon: InkPath },
  { name: 'characters', text: '人物志', note: '记住的名字', icon: InkFigure },
  { name: 'gallery', text: '浮生绘卷', note: '沿途的山河', icon: InkMountain },
  { name: 'journal', text: '旅人手记', note: '河水记得的', icon: InkBrush },
];
const CHOICE_NUMERALS = ['壹', '贰', '叁', '肆', '伍', '陆'];
const ENDING_NUMERALS: Record<string, string> = { I: '一', II: '二', III: '三', IV: '四', V: '五', VI: '六' };

function useTypewriter(id: string | undefined, text: string, speed: number) {
  const [count, setCount] = useState(0);
  const completed = useRef(false);
  useEffect(() => {
    completed.current = speed === 0;
    setCount(speed === 0 ? text.length : 0);
    if (!text || speed === 0) return;
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      if (completed.current) return;
      const next = Math.min(text.length, Math.floor((performance.now() - start) * speed / 1000));
      setCount(next);
      if (next < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [id, text, speed]);
  const reveal = () => { completed.current = true; setCount(text.length); };
  return { count, done: count >= text.length, reveal };
}

function IconButton({ label, children, onClick, className = '', active = false }: { label: string; children: ReactNode; onClick: () => void; className?: string; active?: boolean }) {
  return <button className={`icon-button ${className} ${active ? 'active' : ''}`} onClick={onClick} aria-label={label} title={label}>{children}</button>;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<GameState | null>(loadAutosave);
  const [slots, setSlots] = useState<(SaveSlot | null)[]>(loadSlots);
  const [screen, setScreen] = useState<'home' | 'play'>('home');
  const [modal, setModal] = useState<ModalName | null>(null);
  const [saveMode, setSaveMode] = useState<'save' | 'load'>('save');
  const [auto, setAuto] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const skipPool = useRef(new Set<string>());
  const [hidden, setHidden] = useState(false);
  const [intro, setIntro] = useState<Intro | null>(null);
  const [toast, setToast] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const [stamped, setStamped] = useState<string | null>(null);
  const previousScene = useRef('');
  const audioJump = useRef(false);
  const historyEnd = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number>(0);
  const currentProfile = useRef(profile); currentProfile.current = profile;
  const currentGame = useRef(game); currentGame.current = game;

  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current); setToast(message); setToastKey(v => v + 1);
    toastTimer.current = window.setTimeout(() => setToast(''), 3400);
  }, []);

  const scene = game ? sceneById(game.sceneId) : SCENES[0];
  const beat = useMemo(() => game ? currentBeat(game, profile) : null, [game, profile]);
  const text = beat?.kind === 'text' ? beat.text : '';
  const typing = useTypewriter(screen === 'play' ? beat?.id : undefined, screen === 'play' ? text : '', settings.textSpeed);
  const background = screen === 'home' ? 'hero' : beat?.background ?? 'hero';

  useEffect(() => {
    persist('settings', settings); sound.update(settings);
    document.documentElement.style.setProperty('--dialogue-size', `${settings.fontSize}px`);
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  }, [settings]);

  useEffect(() => {
    const discontinuous = audioJump.current;
    audioJump.current = false;
    sound.direct(scoreFrame(screen === 'home' ? '' : scene.id, screen === 'home' ? null : beat), {
      discontinuous, suppressEffects: discontinuous || skipping,
      blocked: !!modal || !!intro, dimmed: !!modal && modal !== 'music', skipping,
    });
  }, [screen, scene.id, beat, modal, intro, skipping]);

  useEffect(() => {
    if (screen !== 'play' || !game) return;
    setProfile(previous => {
      let next = recordProgress(game, previous);
      if (currentBeat(game, next).kind === 'ending') next = completeEnding(game, next);
      persist('profile', next);
      return next;
    });
    if (!persist('autosave', game)) notify('浏览器存储空间不足，请在设置中导出存档。');
  }, [game, screen, notify]);

  useEffect(() => {
    if (screen !== 'play' || !game) return;
    const old = previousScene.current;
    if (old === game.sceneId) return;
    previousScene.current = game.sceneId;
    const sameChapter = old && sceneById(old).chapter === scene.chapter;
    if (!sameChapter && !(game.sceneId === '1-12' && game.cycle > 1)) {
      const [chapter, ...title] = scene.chapter.split(' ');
      setIntro({ chapter: title.length ? chapter : '终章', title: title.join(' ') || scene.chapter, subtitle: scene.title });
    }
    const all = compileScene(game.sceneId, currentProfile.current, game);
    const futureArt = [...new Set(all.map(b => b.background))];
    const next = SCENES[SCENES.findIndex(item => item.id === game.sceneId) + 1];
    if (next) futureArt.push(next.background);
    for (const art of futureArt) { const image = new Image(); image.src = asset(art); }
  }, [game?.sceneId, screen, game?.cycle, scene.chapter, scene.title]);

  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setIntro(null), settings.reducedMotion ? 850 : 2300);
    return () => clearTimeout(timer);
  }, [intro, settings.reducedMotion]);

  const next = useCallback(() => {
    if (modal || screen !== 'play' || !game || !beat) return;
    if (intro) { setIntro(null); return; }
    if (hidden) { setHidden(false); return; }
    if (beat.kind !== 'text') return;
    if (!typing.done) { typing.reveal(); return; }
    sound.click('page');
    setGame(previous => previous ? advance(previous, currentProfile.current) : previous);
  }, [modal, screen, game, beat, intro, hidden, typing]);

  useEffect(() => {
    if ((!auto && !skipping) || modal || intro || screen !== 'play' || !beat || beat.kind !== 'text') return;
    if (skipping && !skipPool.current.has(beat.id)) { setSkipping(false); notify('已到达未读的故事。'); return; }
    if (!typing.done && !skipping) return;
    const delay = skipping ? 90 : settings.autoDelay * 1000 + Math.min(text.length * 20, 2400);
    const timer = setTimeout(() => {
      setGame(previous => previous ? advance(previous, currentProfile.current) : previous);
    }, delay);
    return () => clearTimeout(timer);
  }, [auto, skipping, modal, intro, screen, beat, typing.done, settings.autoDelay, text.length, notify]);

  const openModal = useCallback((name: ModalName) => { setModal(name); setHidden(false); sound.click('choice'); }, []);
  const openSaves = useCallback((mode: 'save' | 'load') => { setSaveMode(mode); openModal('saves'); }, [openModal]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else notify('可使用浏览器的全屏功能进入沉浸阅读。');
    } catch { notify('可按浏览器全屏快捷键进入沉浸阅读。'); }
  }, [notify]);

  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);

  const keyboard = useRef({ modal, hidden, screen, next, openModal, openSaves, toggleFullscreen });
  keyboard.current = { modal, hidden, screen, next, openModal, openSaves, toggleFullscreen };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const { modal, hidden, screen, next, openModal, openSaves, toggleFullscreen } = keyboard.current;
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (modal) return;
      const key = event.key.toLowerCase();
      if (key === 'escape') { event.preventDefault(); if (hidden) setHidden(false); else openModal('menu'); return; }
      if (key === 'f') { event.preventDefault(); void toggleFullscreen(); return; }
      if (screen !== 'play') return;
      if (event.target instanceof HTMLButtonElement && [' ', 'enter'].includes(key)) return;
      if ([' ', 'enter', 'arrowright'].includes(key)) { event.preventDefault(); next(); }
      if (key === 'h') { event.preventDefault(); setHidden(value => !value); }
      if (key === 'arrowleft') { event.preventDefault(); openModal('history'); }
      if (key === 's') { event.preventDefault(); openSaves('save'); }
      if (key === 'l') { event.preventDefault(); openSaves('load'); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  useEffect(() => { setConfirmHome(false); }, [modal]);
  useEffect(() => { setStamped(null); }, [beat?.id]);

  useEffect(() => {
    if (modal === 'history') requestAnimationFrame(() => historyEnd.current?.scrollIntoView({ block: 'end' }));
  }, [modal]);

  const start = () => {
    void sound.unlock(settings); sound.click('bell');
    previousScene.current = ''; setGame(newGame(profile)); setScreen('play'); setModal(null); setAuto(false); setSkipping(false); setHidden(false);
  };

  const resume = (state = game) => {
    if (!state) return;
    audioJump.current = true;
    void sound.unlock(settings); previousScene.current = state.sceneId;
    setGame(state); setScreen('play'); setModal(null); setIntro(null); setAuto(false); setSkipping(false); setHidden(false);
  };

  const toHome = () => { setScreen('home'); setModal(null); setAuto(false); setSkipping(false); setHidden(false); setIntro(null); };

  const toggleMute = () => {
    const next = { ...settings, muted: !settings.muted };
    setSettings(next); if (!next.muted) void sound.unlock(next);
  };

  const handleChoice = (key: string) => {
    const state = currentGame.current;
    if (!state) return;
    void sound.unlock(settings); sound.click('choice'); setAuto(false); setSkipping(false);
    const updated = choose(state, currentProfile.current, key);
    setGame(updated);
  };

  // 朱印落下之后再翻页；减弱动态时立即选择。
  const pickChoice = (key: string) => {
    if (stamped) return;
    if (settings.reducedMotion) { handleChoice(key); return; }
    void sound.unlock(settings);
    setStamped(key);
    window.setTimeout(() => handleChoice(key), 640);
  };

  const toggleSkip = () => {
    if (!skipping) { skipPool.current = new Set(profile.read); setAuto(false); }
    setSkipping(value => !value);
  };

  const jump = (id: string) => {
    if (id === '0-1' && !profile.visited.includes(id)) { start(); return; }
    const state = game ?? newGame(profile);
    const jumped = revisitScene(state, profile, id);
    audioJump.current = true;
    previousScene.current = ''; setGame(jumped); setScreen('play'); setModal(null); setAuto(false); setSkipping(false); setHidden(false);
    void sound.unlock(settings);
  };

  const saveSlot = (index: number) => {
    if (!game) return;
    const updated = slots.map((slot, i) => i === index ? { version: 1 as const, savedAt: new Date().toISOString(), state: structuredClone(game) } : slot);
    if (persist('slots', updated)) { setSlots(updated); sound.click('bell'); notify(`已在第 ${index + 1} 枚书签留下此刻。`); }
    else notify('书签未能保存，请先导出旅途存档。');
  };

  const deleteSlot = (index: number) => {
    const updated = slots.map((slot, i) => i === index ? null : slot);
    persist('slots', updated); setSlots(updated); notify('这枚书签已移除，阅读记忆仍保留。');
  };

  const importFile = async (file: File) => {
    try {
      if (file.size > 8_000_000) throw new Error('size');
      const data = JSON.parse(await file.text());
      if (data?.format !== 'heterotopia-save' || data.version !== 1 || data.profile?.version !== 1) throw new Error('format');
      const incoming = data.profile as Profile;
      if (!['visited', 'read', 'art', 'met', 'endings'].every(key => Array.isArray(incoming[key as keyof Profile]))) throw new Error('profile');
      const defaults = newProfile();
      const merged = { ...defaults, ...profile };
      merged.visited = [...new Set([...profile.visited, ...incoming.visited.filter(id => SCENES.some(s => s.id === id))])];
      merged.read = [...new Set([...profile.read, ...incoming.read.filter(id => typeof id === 'string')])];
      merged.art = [...new Set([...profile.art, ...incoming.art.filter(id => id in BACKGROUNDS)])];
      merged.met = [...new Set([...profile.met, ...incoming.met.filter(id => typeof id === 'string')])];
      merged.endings = [...new Set([...profile.endings, ...incoming.endings.filter(id => id in ENDINGS)])];
      merged.oldNames = profile.oldNames || incoming.oldNames === true;
      persist('profile', merged); setProfile(merged);
      const importedSlots = slots.map((slot, i) => {
        const item = Array.isArray(data.slots) ? data.slots[i] : null;
        return item?.version === 1 && validState(item.state) && typeof item.savedAt === 'string' && !Number.isNaN(Date.parse(item.savedAt)) ? item as SaveSlot : slot;
      });
      setSlots(importedSlots); persist('slots', importedSlots);
      if (validState(data.state)) { audioJump.current = true; persist('autosave', data.state); setGame(data.state); }
      notify('旅途已导入，已经历的记忆合在了一处。');
    } catch { notify('这份文件无法识读，请选择从本作导出的 JSON 存档。'); }
  };

  let portrait = beat?.kind === 'text' ? characterFor(beat.speaker) : undefined;
  let borrowedBody = false;
  if (portrait?.key === 'shen' && (['royal', 'kunlun', 'common'].includes(scene.route) || scene.id === '终-1')) {
    const all = game ? compileScene(game.sceneId, profile, game) : [];
    const returnedIndex = all.findIndex(item => item.kind === 'text' && item.text.includes('虎口白疤却留在戌'));
    const position = all.findIndex(item => item.id === beat?.id);
    if (scene.id !== '终-1' || returnedIndex < 0 || position <= returnedIndex) {
      portrait = characterFor('戌');
      borrowedBody = true;
    }
  }
  const beats = game ? compileScene(game.sceneId, profile, game) : [];
  const lineKind = beat?.kind !== 'text' ? 'speech' : !beat.speaker ? 'narration' : beat.mood.includes('内心') ? 'inner' : 'speech';
  const position = Math.max(0, beats.findIndex(item => item.id === beat?.id));
  const sceneNumber = String(SCENES.findIndex(item => item.id === scene.id) + 1).padStart(2, '0');
  const locationName = background === 'dream-boat' ? '梦中 · 夜船' : scene.title.split('·').at(-1);
  const modalSeals: Record<ModalName, string> = { chapters: '迹', characters: '名', gallery: '绘', journal: '记', settings: '听', saves: '签', history: '回', menu: '憩', about: '梦', music: '水' };
  const modalInfo: Record<ModalName, [string, string]> = {
    chapters: ['行迹', '走过的水路'], characters: ['人物志', '记住他们的名字'], gallery: ['浮生绘卷', '一程山河'], journal: ['旅人手记', '河水记得的事'], settings: ['听风与读字', '按你自己的节奏'], saves: ['一枚书签', '留住一个瞬间'], history: ['方才的话', '水面上的回声'], menu: ['梦间小憩', '在河边歇一歇'], about: ['关于此梦', '水声未散之前'], music: ['听水集', '河上的十一支曲子'],
  };

  return <main className={`app app--${screen} ${hidden ? 'app--hidden' : ''} ${intro ? 'app--intro' : ''} ${beat?.kind === 'choice' && screen === 'play' ? 'app--choice' : ''}`} onPointerDown={() => { if (!settings.muted) void sound.unlock(settings); }} onKeyDownCapture={() => { if (!settings.muted) void sound.unlock(settings); }}>
    <SceneArt name={background} motion={!settings.reducedMotion} />
    <Atmosphere scene={background} reduced={settings.reducedMotion} />

    {screen === 'home' ? <div className="home-screen">
      <header className="home-header"><button className="brand" onClick={() => openModal('about')} aria-label="关于异托邦"><BoatMark /><span>异托邦<small>HETEROTOPIA</small></span></button><div className="home-header-note"><span className="tiny-line" />一场未尽的楚地远行<span className="tiny-line" /></div><div className="header-tools"><IconButton label={settings.muted ? '开启声音' : '静音'} onClick={toggleMute}><InkBell muted={settings.muted} size={20} /></IconButton><IconButton label={fullscreen ? '退出全屏' : '全屏'} onClick={() => void toggleFullscreen()}><InkFrame size={19} /></IconButton><IconButton label="阅读设置" onClick={() => openModal('settings')}><InkWind size={20} /></IconButton></div></header>
      <div className="home-body">
        <div className="home-eyebrow"><span className="vermillion-seal">归</span><span>东方奇幻 · 叙事视觉小说</span></div>
        <h1 className="home-title">异托邦<span className="title-dust">·</span></h1>
        <div className="home-english"><span />H E T E R O T O P I A<span /></div>
        <div className="home-verse"><span>魂兮归来。</span><p>看路，也看看走路的人。</p></div>
        <nav className={`home-main-menu ${game ? 'home-main-menu--resume' : ''}`} aria-label="启程菜单">
          <button className={`start-button ${game ? 'cta-secondary' : 'cta-primary'}`} onClick={start}><span className="cta-glow" aria-hidden="true" /><strong>{game ? '重新启程' : '启程'}</strong><BoatMark className="cta-boat" /></button>
          <button className={`continue-button ${game ? 'cta-primary' : 'cta-secondary'}`} disabled={!game} onClick={() => resume()}><span className="cta-glow" aria-hidden="true" /><strong>续梦</strong><small>{game ? `${sceneById(game.sceneId).chapter} · ${sceneById(game.sceneId).title.split('·').at(-1)}` : '此刻尚无未尽的梦'}</small></button>
        </nav>
        <div className="home-library">{LIBRARY.map(item => <button key={item.name} onClick={() => openModal(item.name)}><item.icon size={18} /><span>{item.text}</span></button>)}</div>
      </div>
      <div className="home-side-poem" aria-hidden="true"><span>一条河，两片夜。</span><i /><span>循着水声，回家。</span></div>
      <footer className="home-footer"><button className="headphone-note" onClick={() => openModal('music')} aria-label="听水集"><InkDrop size={16} /><span>听水集 · 原声重听</span></button><span className="home-edition">八十一场故事 <i /> 两条归路 <i /> V6 完整版</span><button className="about-link" onClick={() => openModal('about')}>关于此梦 <CircleHelp size={13} strokeWidth={1.3} /></button></footer>
      <div className="home-coordinate" aria-hidden="true"><span>19:37</span><i />THE MOMENT BEFORE THE WATER</div>
    </div> : game && beat ? <div className="game-screen">
      {beat.kind !== 'ending' && <><header className="game-header"><button className="game-location" onClick={() => openModal('chapters')}><span className="location-route">{ROUTE_NAMES[scene.route]}</span><span className="location-divider" /><span className="location-name">{locationName}</span><ChevronDown size={13} strokeWidth={1.2} /></button><span className="chapter-current">{scene.chapter}</span><div className="header-tools"><button className="memory-button" onClick={() => openModal('journal')} aria-label="打开旅人手记"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} small /></button><IconButton label={settings.muted ? '开启声音' : '静音'} onClick={toggleMute}><InkBell muted={settings.muted} size={20} /></IconButton><IconButton label="打开菜单" onClick={() => openModal('menu')}><InkMenu size={21} /></IconButton></div></header>
      <div className="scene-margin-label" key={scene.id} aria-hidden="true"><span>{scene.title.split('·')[0]}</span><i /><small>{scene.id.toUpperCase()}</small></div></>}

      {beat.kind === 'text' && <><button className="advance-surface" onClick={next} aria-label={hidden ? '显示阅读界面' : typing.done ? '继续故事' : '显示全文'} tabIndex={-1} />
        {portrait && settings.showSprites && !intro && <div key={portrait.key} className={`actor actor--${portrait.key}`} style={{ '--actor-tint': portrait.color } as CSSProperties} aria-hidden="true"><div className="actor-glow" /><img src={portraitAsset(portrait.key)} alt="" /><span className="actor-vertical-name">{borrowedBody ? '戌（沈辞）' : portrait.name}</span></div>}
        <section className={`dialogue dialogue--${lineKind}`} aria-label="故事正文">
          <div className="dialogue-mist" aria-hidden="true" />
          <div className="dialogue-body">
            {beat.speaker && <div className="speaker"><span className="speaker-seal"><strong>{beat.speaker}</strong></span>{beat.mood && <span className="speaker-mood">{beat.mood}</span>}</div>}
            <button className="dialogue-advance" onClick={next} aria-label={typing.done ? '继续' : '立即显示全文'}><p className="dialogue-text" data-testid="dialogue-text" aria-label={beat.text}><span aria-hidden="true">{beat.text.slice(0, typing.count)}</span><span aria-hidden="true" className="unrevealed">{beat.text.slice(typing.count)}</span><span className={`advance-indicator ${typing.done ? 'is-ready' : ''}`} aria-hidden="true" /></p></button>
            <footer className="dialogue-footer">
              <div className="scene-bookmark" title="进度已自动保存"><span className="autosaved-dot" /><span>第 {sceneNumber} 场<i> / 81</i></span><span className="dialogue-page">{position + 1}<i> / {beats.length}</i></span></div>
              <nav className={`reading-controls ${toolsOpen ? 'is-open' : ''}`} aria-label="阅读控制">
                <button onClick={() => openModal('history')} title="回看 · ←"><InkBacklog /><span>回看</span></button>
                <button className={auto ? 'selected' : ''} onClick={() => { setAuto(!auto); setSkipping(false); }} aria-pressed={auto} title="自动阅读"><InkLamp lit={auto} /><span>自动</span></button>
                <button className={skipping ? 'selected' : ''} onClick={toggleSkip} aria-pressed={skipping} title="仅跳过已经读过的文字"><InkFlow /><span>快进</span></button>
                <div className="reading-more" id="reading-more" inert={!toolsOpen}>
                  <button onClick={() => openSaves('save')} title="存档 · S"><InkBookmark /><span>存档</span></button>
                  <button onClick={() => openSaves('load')} title="读档 · L"><InkScroll /><span>读档</span></button>
                  <button onClick={() => openModal('settings')} title="阅读设置"><InkWind /><span>设置</span></button>
                  <button onClick={() => { setHidden(true); setToolsOpen(false); }} title="隐藏界面 · H"><InkClosedEye /><span>隐藏</span></button>
                </div>
                <button className="reading-toggle" onClick={() => setToolsOpen(value => !value)} aria-expanded={toolsOpen} aria-controls="reading-more" title={toolsOpen ? '收起' : '存档、读档、设置、隐藏'}><InkMore open={toolsOpen} /><span>{toolsOpen ? '收起' : '更多'}</span></button>
              </nav>
            </footer>
          </div>
        </section>
        {hidden && <div className="hidden-hint">点击画面，或按 H，继续听故事。</div>}
      </>}

      {beat.kind === 'choice' && <section className={`choices choices--${beat.choices.length}`} aria-label="命运选择"><div className="choice-ornament"><span /><BoatMark /><span /></div><p className="choice-prompt">{beat.prompt}</p><div className={`choice-options ${stamped ? 'is-deciding' : ''}`}>{beat.choices.map((choice, i) => <button className={`choice-option ${choice.disabled ? 'choice-option--locked' : ''} ${stamped === choice.key ? 'is-stamped' : ''}`} key={choice.key} disabled={choice.disabled || (!!stamped && stamped !== choice.key)} onClick={() => pickChoice(choice.key)} style={{ '--choice-index': i } as CSSProperties}><span className="choice-lamp" aria-hidden="true" /><span className="choice-index" aria-hidden="true">{CHOICE_NUMERALS[i] ?? i + 1}</span><span className="choice-copy"><strong>{choice.disabled ? '尚未听见的名字' : choice.title}</strong><small>{choice.disabled ? choice.hint : choice.detail}</small></span><span className="choice-stamp" aria-hidden="true">定</span></button>)}</div>{game.sceneId === '1-12' && <div className="choice-note"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} small /><span>{game.cycle > 1 ? '记忆已经留下。此夜的物件，仍在原处。' : '两条路共享此夜。走过之后，记忆会带你回来。'}</span></div>}<button className="choice-save text-button" onClick={() => openSaves('save')}><InkBookmark size={16} />在分路前，留一枚书签</button></section>}

      {beat.kind === 'ending' && <section className={`ending-screen ending-screen--${beat.ending} ${beat.ending === 'home' ? 'ending-screen--home' : ''}`} aria-label={`结局 · ${ENDINGS[beat.ending].title}`}>
        <span className="ending-ink" aria-hidden="true" /><span className="ending-ripple" aria-hidden="true" />
        <div className="ending-content">
          <p className="ending-kicker">{beat.ending === 'home' ? '全剧终' : '命运的回声'}</p>
          <div className="ending-stage">
            <span className="ending-seal" aria-hidden="true">{[...(beat.ending === 'home' ? '团圆' : `回声其${ENDING_NUMERALS[ENDINGS[beat.ending].index] ?? ''}`)].map((char, index) => <i key={index}>{char}</i>)}</span>
            <h2 className="ending-title">{ENDINGS[beat.ending].title}</h2>
            <div className="ending-side"><span className="ending-subtitle">{ENDINGS[beat.ending].subtitle}</span><div className="ending-emblem"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} /></div></div>
          </div>
          <blockquote>{ENDINGS[beat.ending].quote}</blockquote>
          <p className="ending-memory">{beat.ending === 'home' ? '故事写到这里，日子还在继续。' : canReturn(profile) ? '两道裂纹相合。那节晚自习，还在等你。' : '这一程，卜骨已经记住。另一条路，仍在灯下。'}</p>
          <div className="ending-actions"><button className="gold-button" onClick={() => { if (beat.ending === 'home') toHome(); else { const nextProfile = completeEnding(game, profile); setProfile(nextProfile); audioJump.current = true; setGame(continueEnding(game, nextProfile)); sound.click('bell'); } }}>{beat.ending === 'home' ? '回到标题' : canReturn(profile) ? '循光归来' : '再赴灯下'}<ArrowRight size={19} strokeWidth={1.2} /></button><button className="ending-secondary text-button" onClick={() => openModal('journal')}>看看留下的记忆 <Feather size={14} /></button></div>
        </div>
        <span className="ending-copyright">异托邦 · {beat.ending === 'home' ? '谢谢你，记住他们。' : '未完的路，留给下一次启程。'}</span>
      </section>}

      {intro && <button className="chapter-intro" data-testid="chapter-intro" onClick={() => setIntro(null)} aria-label="进入故事"><span className="intro-ink" aria-hidden="true" /><span className="intro-ripple" aria-hidden="true" /><span className="intro-scroll"><span className="intro-chapter">{intro.chapter}</span><h2>{intro.title}</h2><span className="intro-subtitle">{intro.subtitle.replace(/\s*·\s*/g, '・')}</span></span><span className="intro-seal" aria-hidden="true">{intro.chapter === '终章' ? '归' : intro.chapter.slice(0, 2)}</span><span className="intro-click">点击，听水声继续。</span></button>}
    </div> : null}

    {modal && <Modal title={modalInfo[modal][0]} eyebrow={modalInfo[modal][1]} seal={modalSeals[modal]} onClose={() => setModal(null)} className={`modal--${modal}`}>
      {modal === 'chapters' && <ChaptersView profile={profile} currentScene={screen === 'play' ? game?.sceneId : undefined} onJump={jump} />}
      {modal === 'characters' && <CharactersView profile={profile} />}
      {modal === 'gallery' && <GalleryView profile={profile} />}
      {modal === 'journal' && <JournalView state={game} profile={profile} />}
      {modal === 'settings' && <SettingsView settings={settings} onChange={setSettings} onMusic={() => openModal('music')} onExport={() => { exportSave(profile, game, slots); notify('旅途存档已导出。'); }} onImport={file => void importFile(file)} onReset={() => { setSettings(DEFAULT_SETTINGS); notify('阅读设置已恢复。'); }} />}
      {modal === 'saves' && <SaveView slots={slots} state={game} autosave={loadAutosave()} initialMode={saveMode} onSave={saveSlot} onLoad={state => { resume(state); notify('书页翻回了那一刻。'); }} onDelete={deleteSlot} />}
      {modal === 'history' && <div className="history-content">{game?.history.length ? game.history.map((entry, index) => <div className={`history-entry ${entry.kind === 'choice' ? 'history-entry--choice' : ''}`} key={`${entry.id}-${index}`}><span className="history-speaker">{entry.speaker || '叙'}</span><p>{entry.kind === 'choice' && <ChevronRight size={14} />}{entry.text}</p></div>) : <p className="empty-note">刚翻开的书，还没有远去的话。</p>}<div ref={historyEnd} /></div>}
      {modal === 'menu' && <div className="pause-content"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} /><p>不用急。水也可以慢慢流。</p><div className="pause-buttons">{screen === 'play' && <button className="gold-button" onClick={() => setModal(null)}>继续此梦 <Play size={15} /></button>}<div className="pause-grid">{LIBRARY.map(item => <button key={item.name} onClick={() => openModal(item.name)}><item.icon size={24} /><span>{item.text}</span><small>{item.note}</small></button>)}</div><div className="pause-rows"><button className="pause-row" onClick={() => openSaves('save')}><InkBookmark />存读档<ChevronRight size={16} /></button><button className="pause-row" onClick={() => openModal('music')}><InkDrop />听水集<ChevronRight size={16} /></button><button className="pause-row" onClick={() => openModal('settings')}><InkWind />阅读设置<ChevronRight size={16} /></button></div>{screen === 'play' && <button className={`pause-row pause-row--home ${confirmHome ? 'is-confirming' : ''}`} onClick={() => { if (confirmHome) toHome(); else setConfirmHome(true); }} aria-live="polite"><InkReturn />{confirmHome ? '再点一次，回到标题' : '回到标题'}<small>{confirmHome ? '此刻已自动留存，可随时续梦' : '此刻已自动留存'}</small></button>}</div></div>}
      {modal === 'about' && <AboutView />}
      {modal === 'music' && <MusicRoom profile={profile} settings={settings} onChange={setSettings} />}
    </Modal>}
    {toast && <div className="toast" key={toastKey} role="status"><span className="toast-seal" aria-hidden="true"><Check size={13} strokeWidth={2} /></span>{toast}<button onClick={() => setToast('')} aria-label="关闭提示"><X size={13} /></button></div>}
    {auto && screen === 'play' && !modal && !intro && beat?.kind === 'text' && <button className="reading-mode-indicator" onClick={() => setAuto(false)}><span />自动阅读中 <Pause size={11} /></button>}
    {skipping && screen === 'play' && !modal && <button className="reading-mode-indicator" onClick={() => setSkipping(false)}><SkipForward size={12} />已读快进中</button>}
  </main>;
}
