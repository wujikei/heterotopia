import { AudioButton } from './components/AudioButton';
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, CircleHelp, Feather, Pause, Play, SkipForward, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { sound } from './audio';
import { setArtQuality } from './assets';
import { Atmosphere, BoatMark, BoneMark, SceneArt } from './components/Atmosphere';
import { Modal } from './components/Modal';
import { ActorLayer } from './components/ActorLayer';
import { UpdateNotice } from './components/UpdateNotice';
import { EndingQuote } from './components/EndingQuote';
import { InkBacklog, InkBell, InkBookmark, InkBrush, InkClosedEye, InkDrop, InkFigure, InkFlow, InkFrame, InkLamp, InkMenu, InkMore, InkMountain, InkPath, InkReturn, InkScroll, InkWind } from './components/InkIcons';
import { asset, BACKGROUNDS, CHARACTERS, ENDINGS, portraitAsset } from './data/world';
import { actorForBeat } from './actors';
import { actorPortraitName } from './data/actorVariants';
import { relicForBeat } from './data/relics';
import type { RelicId } from './data/relics';
import { locationForBeat } from './scenePresentation';
import { cgForBeat } from './data/cgs';
import { prefetchWhenIdle, preloadImage } from './preload';
import { afterFirstScreen } from './idle';
import { warmReadingFonts } from './fonts';
import { isStoryReady, loadStory } from './story';
import { advance, canReturn, choose, compileScene, completeEnding, continueEnding, currentBeat, hasKunlun, hasRoyal, newGame, newProfile, recordProgress, revisitScene, SCENES, sceneById } from './engine';
import { DEFAULT_SETTINGS, exportSave, loadAutosave, loadProfile, loadSettings, loadSlots, persist, validState } from './storage';
import { scoreFrame } from './score';
import { replayHistory } from './reading';
import { autoDelayFor } from './autoReading';
import type { GameState, Profile, SaveSlot, Settings } from './types';
import './styles/reading-audio.css';

const Backlog = lazy(() => import('./components/Backlog').then(module => ({ default: module.Backlog })));
const MusicRoom = lazy(() => import('./components/MusicRoom').then(module => ({ default: module.MusicRoom })));
const AboutView = lazy(() => import('./components/Library').then(module => ({ default: module.AboutView })));
const ChaptersView = lazy(() => import('./components/Library').then(module => ({ default: module.ChaptersView })));
const CharactersView = lazy(() => import('./components/Library').then(module => ({ default: module.CharactersView })));
const GalleryView = lazy(() => import('./components/Library').then(module => ({ default: module.GalleryView })));
const JournalView = lazy(() => import('./components/Library').then(module => ({ default: module.JournalView })));
const SaveView = lazy(() => import('./components/Library').then(module => ({ default: module.SaveView })));
const SettingsView = lazy(() => import('./components/Library').then(module => ({ default: module.SettingsView })));

type ModalName = 'chapters' | 'characters' | 'gallery' | 'journal' | 'settings' | 'saves' | 'history' | 'menu' | 'about' | 'music';
type Intro = { chapter: string; title: string; subtitle: string };
function openingIntro(state: GameState, profile: Profile): Intro {
  const scene = sceneById(state.sceneId);
  const [chapter, ...title] = scene.chapter.split(' ');
  const opening = currentBeat(state, profile);
  return { chapter: title.length ? chapter : '终章', title: title.join(' ') || scene.chapter,
    subtitle: BACKGROUNDS[opening.background]?.subtitle ?? scene.title };
}

const LIBRARY: { name: ModalName; text: string; note: string; icon: typeof InkPath }[] = [
  { name: 'chapters', text: '行迹', note: '走过的水路', icon: InkPath },
  { name: 'characters', text: '人物志', note: '记住的名字', icon: InkFigure },
  { name: 'gallery', text: '浮生绘卷', note: '沿途的山河', icon: InkMountain },
  { name: 'journal', text: '旅人手记', note: '河水记得的', icon: InkBrush },
];
const CHOICE_NUMERALS = ['壹', '贰', '叁', '肆', '伍', '陆'];
const ENDING_NUMERALS: Record<string, string> = { I: '一', II: '二', III: '三', IV: '四', V: '五', VI: '六' };

function useTypewriter(id: string | undefined, text: string, speed: number, paused: boolean) {
  const key = `${id ?? ''}\u0000${text}`;
  const [progress, setProgress] = useState({ key: '', count: 0 });
  const completed = useRef(false);
  const count = paused ? 0 : speed === 0 ? text.length : progress.key === key ? progress.count : 0;
  useEffect(() => {
    completed.current = speed === 0;
    setProgress({ key, count: !paused && speed === 0 ? text.length : 0 });
    if (paused || !text || speed === 0) return;
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      if (completed.current) return;
      const next = Math.min(text.length, Math.floor((performance.now() - start) * speed / 1000));
      setProgress(previous => previous.key === key && previous.count === next ? previous : { key, count: next });
      if (next < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, text, speed, paused]);
  const reveal = () => { completed.current = true; setProgress({ key, count: text.length }); };
  return { count, done: !paused && count >= text.length, reveal };
}

function IconButton({ label, children, onClick, className = '', active = false, audioControl = false }: { label: string; children: ReactNode; onClick: () => void; className?: string; active?: boolean; audioControl?: boolean }) {
  const Button = audioControl ? AudioButton : 'button';
  return <Button className={`icon-button ${className} ${active ? 'active' : ''}`} onClick={onClick} aria-label={label} title={label}>{children}</Button>;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const audioState = useSyncExternalStore(sound.subscribe, sound.getSnapshot);
  const [game, setGame] = useState<GameState | null>(loadAutosave);
  const [slots, setSlots] = useState<(SaveSlot | null)[]>(loadSlots);
  const [screen, setScreen] = useState<'home' | 'play'>('home');
  const [storyReady, setStoryReady] = useState(isStoryReady);
  const [loadingReading, setLoadingReading] = useState(false);
  const [readingError, setReadingError] = useState(false);
  const readingLoad = useRef(false);
  const [modalPath, setModalPath] = useState<ModalName[]>([]);
  const modal = modalPath.at(-1) ?? null;
  const modalParent = modalPath.at(-2);
  const [saveMode, setSaveMode] = useState<'save' | 'load'>('save');
  const [journalRelic, setJournalRelic] = useState<RelicId | undefined>();
  const [auto, setAuto] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [holdingSkip, setHoldingSkip] = useState(false);
  const isSkipping = skipping || holdingSkip;
  const skipPool = useRef(new Set<string>());
  const [hidden, setHidden] = useState(false);
  const [intro, setIntro] = useState<Intro | null>(null);
  const [toast, setToast] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const [stamped, setStamped] = useState<string | null>(null);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [showReadingHint, setShowReadingHint] = useState(() => {
    try { return localStorage.getItem('heterotopia.v1.readingHint') !== 'true'; } catch { return true; }
  });
  const previousScene = useRef('');
  const audioJump = useRef(false);
  const readingRef = useRef<HTMLDivElement>(null);
  const modalOpener = useRef<HTMLElement | null>(null);
  const nextAllowedAt = useRef(0);
  const choiceTimer = useRef(0);
  const stampTimer = useRef(0);
  const choiceRequest = useRef(0);
  const toastTimer = useRef<number>(0);
  const currentProfile = useRef(profile); currentProfile.current = profile;
  const currentGame = useRef(game); currentGame.current = game;
  const currentSettings = useRef(settings); currentSettings.current = settings;

  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current); setToast(message); setToastKey(v => v + 1);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  }, []);
  const stopSkipping = useCallback(() => { setSkipping(false); setHoldingSkip(false); }, []);
  const clearChoiceTimers = useCallback(() => {
    ++choiceRequest.current;
    clearTimeout(choiceTimer.current); choiceTimer.current = 0;
    clearTimeout(stampTimer.current); stampTimer.current = 0;
  }, []);
  const closeModal = useCallback(() => {
    if (document.querySelector('[role="dialog"]')) sound.click('close');
    setModalPath([]);
  }, []);
  const backModal = useCallback(() => { sound.click('close'); setModalPath(path => path.slice(0, -1)); }, []);
  const changeSettings = useCallback((next: Settings) => {
    const wasMuted = currentSettings.current.muted;
    currentSettings.current = next;
    // Commit the gesture before a reload can interrupt React's passive effects.
    persist('settings', next);
    sound.update(next); setSettings(next);
    // Resume synchronously inside this setting gesture, then acknowledge it.
    if (wasMuted && !next.muted) void sound.unlock(next).then(() => sound.click('toggle'));
  }, []);

  const scene = game ? sceneById(game.sceneId) : SCENES[0];
  const beat = useMemo(() => game && storyReady ? currentBeat(game, profile) : null, [game, profile, storyReady]);
  const beats = useMemo(() => game && storyReady ? compileScene(game.sceneId, profile, game) : [], [game, profile, storyReady]);
  const text = beat?.kind === 'text' ? beat.text : '';
  const typing = useTypewriter(screen === 'play' ? beat?.id : undefined, screen === 'play' ? text : '', isSkipping ? 0 : settings.textSpeed, !!intro);
  const background = screen === 'home' ? 'hero' : beat?.background ?? 'hero';
  const cg = screen === 'play' && beat ? cgForBeat(beat, scene.id) : undefined;
  const relic = screen === 'play' && beat?.kind === 'text' ? relicForBeat(beat.id) : undefined;

  useLayoutEffect(() => setArtQuality(settings.lightweight), [settings.lightweight]);

  useEffect(() => {
    if (screen !== 'home' || storyReady || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    return afterFirstScreen(() => { void loadStory().then(() => setStoryReady(true)).catch(() => {}); });
  }, [screen, storyReady]);

  useEffect(() => {
    persist('settings', settings); sound.update(settings);
    document.documentElement.style.setProperty('--dialogue-size', `${settings.fontSize}px`);
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  }, [settings]);

  useEffect(() => {
    const discontinuous = audioJump.current;
    audioJump.current = false;
    sound.direct(scoreFrame(screen === 'home' ? '' : scene.id, screen === 'home' ? null : beat), {
      discontinuous, suppressEffects: discontinuous || isSkipping,
      blocked: !!modal || !!intro, dimmed: !!modal && modal !== 'music', skipping: isSkipping,
    });
  }, [screen, scene.id, beat, modal, intro, isSkipping]);

  useEffect(() => {
    const activate = (event?: Event) => {
      // Audio controls own this gesture: a capture-phase unlock can rerender a
      // blocked 'enable' into 'mute' before the same pointer/Space click arrives.
      if (event?.target instanceof Element && event.target.closest('[data-audio-control]')) return;
      if (!currentSettings.current.muted && !sound.getSnapshot().unlocked) void sound.unlock(currentSettings.current);
    };
    activate();
    document.addEventListener('pointerdown', activate, true);
    document.addEventListener('keydown', activate, true);
    return () => {
      document.removeEventListener('pointerdown', activate, true);
      document.removeEventListener('keydown', activate, true);
    };
  }, []);

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
      setIntro(openingIntro(game, currentProfile.current));
    }
  }, [game?.sceneId, screen, game?.cycle, scene.chapter, scene.title]);

  useEffect(() => {
    if (screen !== 'play' || !game) return;
    const current = compileScene(game.sceneId, currentProfile.current, game);
    const next = SCENES[SCENES.findIndex(item => item.id === game.sceneId) + 1];
    const upcoming = next ? compileScene(next.id, currentProfile.current, game) : [];
    const portraits = new Set<string>();
    // Prefetch the actual costumes and poses selected for these pages.
    for (const [items, location] of [[current, scene], [upcoming, next]] as const) {
      if (!location) continue;
      for (const item of items) {
        const actor = actorForBeat(item, location, items);
        if (actor) portraits.add(asset(actorPortraitName(actor)));
      }
    }
    const position = Math.max(0, current.findIndex(item => item.id === game.beatId));
    const nearest = current.slice(position).map(item => actorForBeat(item, scene, current)).find(Boolean);
    const urgent = [
      ...(nearest ? [preloadImage(asset(actorPortraitName(nearest)), 'high')] : []),
      preloadImage(asset(cgForBeat(current[position], scene.id)?.file || current[position].background)),
    ];
    let cancelled = false;
    let stopIdle: (() => void) | undefined;
    // The first visible person must not compete with speculative scenery.
    void Promise.allSettled(urgent).then(async () => {
      if (cancelled) return;
      const rest = [...portraits, ...new Set([
        ...current.map(item => asset(cgForBeat(item, scene.id)?.file || item.background)),
        ...upcoming.map(item => asset(cgForBeat(item, next!.id)?.file || item.background)),
      ])];
      await Promise.allSettled(rest.map(url => preloadImage(url, 'low')));
      if (!cancelled) stopIdle = prefetchWhenIdle(CHARACTERS.map(character => portraitAsset(character.key)));
    });
    return () => { cancelled = true; stopIdle?.(); };
  }, [game?.sceneId, game?.cycle, screen, scene, settings.lightweight]);

  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setIntro(null), settings.reducedMotion ? 850 : 2300);
    return () => clearTimeout(timer);
  }, [intro, settings.reducedMotion]);

  const next = useCallback(() => {
    if (modal || screen !== 'play' || !game || !beat) return;
    const now = performance.now();
    if (now < nextAllowedAt.current) return;
    if (intro) { nextAllowedAt.current = now + 180; setIntro(null); return; }
    if (hidden) { nextAllowedAt.current = now + 180; setHidden(false); sound.click('toggle'); return; }
    if (beat.kind !== 'text') return;
    nextAllowedAt.current = now + 180;
    if (!typing.done) { typing.reveal(); return; }
    sound.click('page');
    setGame(previous => previous ? advance(previous, currentProfile.current) : previous);
  }, [modal, screen, game, beat, intro, hidden, typing]);

  useEffect(() => {
    if ((!auto && !isSkipping) || modal || intro || hidden || !pageVisible || screen !== 'play' || !beat || beat.kind !== 'text') return;
    if (isSkipping && !skipPool.current.has(beat.id)) { stopSkipping(); notify('已到达未读的故事。'); return; }
    if (!typing.done && !isSkipping) return;
    const delay = isSkipping ? 90 : autoDelayFor(text, settings.autoDelay);
    const timer = setTimeout(() => {
      setGame(previous => previous ? advance(previous, currentProfile.current) : previous);
    }, delay);
    return () => clearTimeout(timer);
  }, [auto, isSkipping, modal, intro, hidden, pageVisible, screen, beat, typing.done, settings.autoDelay, text, notify, stopSkipping]);

  useEffect(() => {
    if (screen === 'play' && beat?.kind === 'choice' && !modal && !intro) sound.prepareUi('stamp');
  }, [screen, beat?.id, beat?.kind, modal, intro]);

  const openModal = useCallback((name: ModalName) => {
    if (name === 'journal') setJournalRelic(undefined);
    if (name === 'saves' && !isStoryReady()) void loadStory().then(() => setStoryReady(true)).catch(() => {});
    if (!document.querySelector('[role="dialog"]')) modalOpener.current = document.activeElement as HTMLElement | null;
    setModalPath(path => path.at(-1) === name ? path : [...path, name]);
    setHidden(false); setHoldingSkip(false);
    clearChoiceTimers(); setStamped(null);
    clearTimeout(toastTimer.current); setToast(''); sound.click('open');
  }, [clearChoiceTimers]);
  const openSaves = useCallback((mode: 'save' | 'load') => { setSaveMode(mode); openModal('saves'); }, [openModal]);

  const toggleFullscreen = useCallback(async () => {
    sound.click('toggle');
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

  useEffect(() => { setConfirmHome(false); }, [modal]);
  useEffect(() => {
    setStamped(null);
    return clearChoiceTimers;
  }, [beat?.id, screen, modal, intro, clearChoiceTimers]);
  useEffect(() => {
    const visibility = () => {
      setPageVisible(!document.hidden);
      // Background timers can be delayed until focus returns. Never play an
      // old stamp then; the already chosen route may still finish silently.
      if (document.hidden) { clearTimeout(stampTimer.current); stampTimer.current = 0; }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const prepareReading = async (stateForReading: () => GameState): Promise<GameState | null> => {
    if (readingLoad.current) return null;
    readingLoad.current = true; setLoadingReading(true); setReadingError(false);
    try {
      await loadStory(); setStoryReady(true);
      const state = stateForReading();
      const location = sceneById(state.sceneId);
      const items = compileScene(state.sceneId, currentProfile.current, state);
      const position = Math.max(0, items.findIndex(item => item.id === state.beatId));
      const nearest = items.slice(position).map(item => actorForBeat(item, location, items)).find(Boolean);
      const currentBeatArt = cgForBeat(items[position], location.id)?.file || items[position].background;
      const critical = [preloadImage(asset(currentBeatArt), 'high')];
      if (nearest) critical.push(preloadImage(asset(actorPortraitName(nearest)), 'high'));
      let timer = 0;
      // Keep a stalled image from blocking the story; loading failures stay retryable.
      await Promise.race([Promise.allSettled(critical), new Promise(resolve => { timer = window.setTimeout(resolve, 4000); })]);
      clearTimeout(timer);
      warmReadingFonts();
      return state;
    } catch { setReadingError(true); notify('旅途未能载入，请检查网络后刷新重试。'); return null; }
    finally { readingLoad.current = false; setLoadingReading(false); }
  };

  const start = async () => {
    void sound.unlock(settings); sound.click('bell');
    const state = await prepareReading(() => newGame(currentProfile.current));
    if (!state) return;
    previousScene.current = state.sceneId; setIntro(openingIntro(state, currentProfile.current));
    setGame(state); setScreen('play'); closeModal(); setAuto(false); stopSkipping(); setHidden(false);
  };

  const resume = async (state = game) => {
    if (!state) return;
    void sound.unlock(settings);
    state = await prepareReading(() => state!);
    if (!state) return;
    audioJump.current = true;
    previousScene.current = state.sceneId;
    setGame(state); setScreen('play'); closeModal(); setIntro(null); setAuto(false); stopSkipping(); setHidden(false);
  };

  const toHome = () => { setScreen('home'); closeModal(); setAuto(false); stopSkipping(); setHidden(false); setIntro(null); };

  const toggleMute = () => {
    if (!settings.muted && audioState.needsGesture) { void sound.unlock(settings); return; }
    const next = { ...settings, muted: !settings.muted };
    changeSettings(next);
  };

  const handleChoice = (key: string) => {
    const state = currentGame.current;
    if (!state) return;
    setAuto(value => value && currentSettings.current.autoAfterChoice); stopSkipping();
    const updated = choose(state, currentProfile.current, key);
    setGame(updated);
  };

  // 朱印落下之后再翻页；减弱动态时立即选择。
  const pickChoice = (key: string) => {
    if (stamped || choiceTimer.current || beat?.kind !== 'choice' || !beat.choices.some(choice => choice.key === key && !choice.disabled)) return;
    void sound.unlock(settings);
    if (settings.reducedMotion) { sound.click('stamp'); handleChoice(key); return; }
    setStamped(key);
    const selectedBeat = beat.id;
    const request = ++choiceRequest.current;
    choiceTimer.current = window.setTimeout(() => {
      choiceTimer.current = 0;
      if (request === choiceRequest.current && currentGame.current?.beatId === selectedBeat) handleChoice(key);
    }, 640);
  };

  const stampAtContact = (key: string, animation: string) => {
    if (animation !== 'stamp-down' || stamped !== key || stampTimer.current || !choiceTimer.current) return;
    // Start from the rendered animation so a slow frame cannot move the sound
    // ahead of the seal. The 20ms audio lead lands near the 300ms contact.
    const request = choiceRequest.current, selectedBeat = currentGame.current?.beatId;
    stampTimer.current = window.setTimeout(() => {
      stampTimer.current = 0;
      if (request === choiceRequest.current && currentGame.current?.beatId === selectedBeat) sound.click('stamp');
    }, 280);
  };

  const toggleSkip = () => {
    sound.click('toggle');
    if (isSkipping) stopSkipping();
    else { skipPool.current = new Set(profile.read); setAuto(false); setSkipping(true); }
  };
  const toggleAuto = () => { sound.click('toggle'); setAuto(value => !value); stopSkipping(); };

  const jump = async (id: string) => {
    if (id === '0-1' && !profile.visited.includes(id)) { start(); return; }
    void sound.unlock(settings);
    const jumped = await prepareReading(() => revisitScene(game ?? newGame(currentProfile.current), currentProfile.current, id));
    if (!jumped) return;
    audioJump.current = true;
    previousScene.current = ''; setGame(jumped); setScreen('play'); closeModal(); setAuto(false); stopSkipping(); setHidden(false);
    void sound.unlock(settings);
  };

  const replay = (index: number) => {
    if (!game) return;
    const reread = replayHistory(game, profile, index);
    if (reread === game) return;
    audioJump.current = true;
    nextAllowedAt.current = performance.now() + 180;
    setGame(reread); closeModal(); setAuto(false); stopSkipping(); setHidden(false);
  };

  const saveSlot = (index: number) => {
    if (!game) return;
    const updated = slots.map((slot, i) => i === index ? { version: 1 as const, savedAt: new Date().toISOString(), state: structuredClone(game) } : slot);
    if (persist('slots', updated)) { setSlots(updated); sound.click('save'); notify(`已在第 ${index + 1} 枚书签留下此刻。`); }
    else notify('书签未能保存，请先导出旅途存档。');
  };

  const deleteSlot = (index: number) => {
    const updated = slots.map((slot, i) => i === index ? null : slot);
    if (persist('slots', updated)) { setSlots(updated); notify('这枚书签已移除，阅读记忆仍保留。'); }
    else notify('书签未能移除，请先导出旅途存档。');
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

  const keyboard = useRef({ modal, hidden, screen, next, openModal, openSaves, toggleFullscreen, toggleAuto, pickChoice, beat, intro, isSkipping, profile });
  keyboard.current = { modal, hidden, screen, next, openModal, openSaves, toggleFullscreen, toggleAuto, pickChoice, beat, intro, isSkipping, profile };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const state = keyboard.current;
      if (event.isComposing || event.defaultPrevented || state.modal) return;
      if (event.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      if (key === 'control') {
        if (!event.repeat && !event.altKey && !event.metaKey && !state.intro && !state.hidden && state.screen === 'play' && state.beat?.kind === 'text') {
          if (!state.isSkipping) skipPool.current = new Set(state.profile.read);
          setHoldingSkip(true); setAuto(false);
        }
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (key === 'escape') { event.preventDefault(); if (state.hidden) setHidden(false); else state.openModal('menu'); return; }
      if (key === 'f') { event.preventDefault(); void state.toggleFullscreen(); return; }
      if (state.screen !== 'play') return;
      if (event.target instanceof HTMLButtonElement && !event.target.classList.contains('dialogue-advance') && [' ', 'enter'].includes(key)) return;
      if ([' ', 'enter', 'arrowright'].includes(key)) { event.preventDefault(); state.next(); return; }
      if (state.intro) return;
      if (key === 'h' && (state.beat?.kind === 'text' || state.beat?.kind === 'ending')) { event.preventDefault(); sound.click('toggle'); setHidden(value => !value); }
      if (key === 'arrowleft' || key === 'pageup') { event.preventDefault(); state.openModal('history'); }
      if (key === 'a' && state.beat?.kind === 'text') { event.preventDefault(); state.toggleAuto(); }
      if (/^[1-6]$/.test(key) && state.beat?.kind === 'choice') {
        const choice = state.beat.choices[Number(key) - 1];
        if (choice && !choice.disabled) { event.preventDefault(); state.pickChoice(choice.key); }
      }
      if (key === 's') { event.preventDefault(); state.openSaves('save'); }
      if (key === 'l') { event.preventDefault(); state.openSaves('load'); }
    };
    const keyup = (event: KeyboardEvent) => { if (event.key === 'Control') setHoldingSkip(false); };
    const release = () => setHoldingSkip(false);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, []);

  const restoreModalFocus = () => {
    if (readingRef.current) (readingRef.current.querySelector<HTMLElement>('.dialogue-advance') ?? readingRef.current).focus({ preventScroll: true });
    else if (modalOpener.current?.isConnected) modalOpener.current.focus({ preventScroll: true });
    else document.querySelector<HTMLElement>('.home-main-menu .cta-primary')?.focus({ preventScroll: true });
  };
  const dismissReadingHint = () => { setShowReadingHint(false); persist('readingHint', true); };

  const lineKind = beat?.kind !== 'text' ? 'speech' : !beat.speaker ? 'narration' : beat.mood.includes('内心') ? 'inner' : 'speech';
  const position = Math.max(0, beats.findIndex(item => item.id === beat?.id));
  const locationName = beat ? locationForBeat(scene, beat) : scene.title;
  const modalSeals: Record<ModalName, string> = { chapters: '迹', characters: '名', gallery: '绘', journal: '记', settings: '听', saves: '签', history: '回', menu: '憩', about: '梦', music: '水' };
  const modalInfo: Record<ModalName, [string, string]> = {
    chapters: ['行迹', '走过的水路'], characters: ['人物志', '记住他们的名字'], gallery: ['浮生绘卷', '一程山河'], journal: ['旅人手记', '河水记得的事'], settings: ['听风与读字', '按你自己的节奏'], saves: ['一枚书签', '留住一个瞬间'], history: ['方才的话', '水面上的回声'], menu: ['梦间小憩', '在河边歇一歇'], about: ['关于此梦', '水声未散之前'], music: ['听水集', '河上的十一支曲子'],
  };
  const toastNotice = toast && <div className={`toast ${modal ? 'toast--inline' : ''}`} key={toastKey} role="status"><span className="toast-seal" aria-hidden="true"><Check size={13} strokeWidth={2} /></span><span>{toast}</span><button onClick={() => setToast('')} aria-label="关闭提示"><X size={13} /></button></div>;

  return <main className={`app app--${screen} ${modal ? 'app--modal' : ''} ${hidden ? 'app--hidden' : ''} ${intro ? 'app--intro' : ''} ${beat?.kind === 'choice' && screen === 'play' ? 'app--choice' : ''}`}>
    <SceneArt name={background} cg={cg?.file} motion={!settings.reducedMotion && !cg} />
    <Atmosphere scene={background} reduced={settings.reducedMotion} />

    {screen === 'home' ? <div className="home-screen" inert={!!modal}>
      <header className="home-header"><button className="brand" onClick={() => openModal('about')} aria-label="关于异托邦"><BoatMark /><span>异托邦<small>HETEROTOPIA</small></span></button><div className="home-header-note"><span className="tiny-line" />一场未尽的楚地远行<span className="tiny-line" /></div><div className="header-tools"><IconButton audioControl label={settings.muted ? '开启声音' : audioState.needsGesture ? '点击开启声音' : '静音'} onClick={toggleMute}><InkBell muted={settings.muted} size={20} /></IconButton><IconButton label={fullscreen ? '退出全屏' : '全屏'} onClick={() => void toggleFullscreen()}><InkFrame size={19} /></IconButton><IconButton label="阅读设置" onClick={() => openModal('settings')}><InkWind size={20} /></IconButton></div></header>
      <div className="home-body">
        <div className="home-eyebrow"><span className="vermillion-seal">归</span><span>东方奇幻 · 叙事视觉小说</span></div>
        <h1 className="home-title">异托邦<span className="title-dust">·</span></h1>
        <div className="home-english"><span />H E T E R O T O P I A<span /></div>
        <div className="home-verse"><span>魂兮归来。</span><p>看路，也看看走路的人。</p></div>
        <nav className={`home-main-menu ${game ? 'home-main-menu--resume' : ''}`} aria-label="启程菜单">
          <button className={`start-button ${game ? 'cta-secondary' : 'cta-primary'}`} disabled={loadingReading} onClick={() => void start()}><span className="cta-glow" aria-hidden="true" /><strong>{game ? '重新启程' : '启程'}</strong><BoatMark className="cta-boat" /></button>
          <button className={`continue-button ${game ? 'cta-primary' : 'cta-secondary'}`} disabled={!game || loadingReading} onClick={() => void resume()}><span className="cta-glow" aria-hidden="true" /><strong>续梦</strong><small>{game ? `${sceneById(game.sceneId).chapter} · ${sceneById(game.sceneId).title.split('·').at(-1)}` : '此刻尚无未尽的梦'}</small></button>
        </nav>
        {loadingReading && <p className="reading-load" role="status">正在载入旅途…</p>}
        {readingError && <p className="reading-load" role="alert"><button onClick={() => location.reload()}>刷新重试</button></p>}
        <div className="home-library">{LIBRARY.map(item => <button key={item.name} onClick={() => openModal(item.name)}><item.icon size={18} /><span>{item.text}</span></button>)}</div>
      </div>
      <div className="home-side-poem" aria-hidden="true"><span>一条河，两片夜。</span><i /><span>循着水声，回家。</span></div>
      <footer className="home-footer"><button className="headphone-note" onClick={() => openModal('music')} aria-label="听水集"><InkDrop size={16} /><span>听水集 · 原声重听{audioState.needsGesture && audioState.available && !settings.muted && <small className="sound-unlock-hint">点击开启声音</small>}</span></button><span className="home-edition">八十一场故事 <i /> 两条归路 <i /> V6 完整版</span><button className="about-link" onClick={() => openModal('about')}>关于此梦 <CircleHelp size={13} strokeWidth={1.3} /></button></footer>
      <div className="home-coordinate" aria-hidden="true"><span>19:37</span><i />THE MOMENT BEFORE THE WATER</div>
    </div> : game && beat ? <div className="game-screen" ref={readingRef} tabIndex={-1} inert={!!modal} onClickCapture={event => {
      if (event.detail > 0 && event.target instanceof Element && event.target.closest('button') && !event.target.closest('.dialogue-advance')) readingRef.current?.focus({ preventScroll: true });
    }} onWheel={event => { if (event.deltaY < -8 && !modal && !intro && !hidden && beat.kind === 'text') openModal('history'); }}>
      {beat.kind !== 'ending' && <header className="game-header" inert={hidden || !!intro}><button className="game-location" onClick={() => openModal('chapters')} aria-label="查看行迹"><span className="location-copy"><span className="location-chapter">{scene.chapter}</span><span className="location-name">{locationName}</span></span><ChevronDown size={13} strokeWidth={1.2} /></button><div className="header-tools"><button className="memory-button" onClick={() => openModal('journal')} aria-label="打开旅人手记"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} small /></button><IconButton audioControl label={settings.muted ? '开启声音' : audioState.needsGesture ? '点击开启声音' : '静音'} onClick={toggleMute}><InkBell muted={settings.muted} size={20} /></IconButton>{audioState.needsGesture && !settings.muted && <span className="sound-unlock-hint">点击开启声音</span>}<IconButton label="打开菜单" onClick={() => openModal('menu')}><InkMenu size={21} /></IconButton></div></header>}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{!intro && !modal && !hidden && !isSkipping && beat.kind === 'text' ? `${beat.speaker ? `${beat.speaker}：` : ''}${beat.text}` : ''}</div>
      {showReadingHint && !intro && !modal && !hidden && !auto && !isSkipping && beat.kind === 'text' && <aside className="reading-hint" aria-label="阅读提示"><CircleHelp size={16} aria-hidden="true" /><p>点击画面继续，点「回看」重读。<small>更多操作可在阅读设置中查看。</small></p><button onClick={dismissReadingHint}>知道了</button></aside>}

      {settings.showSprites && !intro && !cg && <ActorLayer beat={beat} scene={scene} beats={beats} reducedMotion={settings.reducedMotion} skipping={isSkipping} />}
      {beat.kind === 'text' && <><button className="advance-surface" onClick={next} aria-label={hidden ? '显示阅读界面' : typing.done ? '继续故事' : '显示全文'} tabIndex={-1} />
        <section className={`dialogue dialogue--${lineKind}`} aria-label="故事正文" inert={hidden || !!intro}>
          <div className="dialogue-mist" aria-hidden="true" />
          <div className="dialogue-body">
            {relic && !hidden && !intro && <button className="relic-cue" onClick={() => { openModal('journal'); setJournalRelic(relic.id); }} aria-label={`细看${relic.title}`}><InkBrush size={15} /><span>物笺 · {relic.title}</span><ArrowRight size={13} /></button>}
            {beat.speaker && <div className="speaker"><span className="speaker-seal"><strong>{beat.speaker}</strong></span>{beat.mood && <span className="speaker-mood">{beat.mood}</span>}</div>}
            <button className="dialogue-advance" onClick={next} aria-label={typing.done ? '继续' : '立即显示全文'}><p className="dialogue-text" data-testid="dialogue-text" aria-label={beat.text}><span aria-hidden="true">{beat.text.slice(0, typing.count)}</span><span aria-hidden="true" className="unrevealed">{beat.text.slice(typing.count)}</span><span className={`advance-indicator ${typing.done ? 'is-ready' : ''}`} aria-hidden="true" /></p></button>
            <footer className="dialogue-footer">
              <div className="scene-bookmark" title="进度已自动保存"><span className="autosaved-dot" /><span>已留存</span><span className="dialogue-page">{position + 1}<i> / {beats.length}</i></span></div>
              <nav className={`reading-controls ${toolsOpen ? 'is-open' : ''}`} aria-label="阅读控制">
                <button onClick={() => openModal('history')} title="回看 · ← / PageUp"><InkBacklog /><span>回看</span></button>
                <button className={auto ? 'selected' : ''} onClick={toggleAuto} aria-pressed={auto} title="自动阅读 · A"><InkLamp lit={auto} /><span>自动</span></button>
                <button className={isSkipping ? 'selected' : ''} onClick={toggleSkip} aria-pressed={isSkipping} title="仅跳过已读 · 按住 Ctrl"><InkFlow /><span>快进</span></button>
                <div className="reading-more" id="reading-more" inert={!toolsOpen}>
                  <button onClick={() => openSaves('save')} title="存档 · S"><InkBookmark /><span>存档</span></button>
                  <button onClick={() => openSaves('load')} title="读档 · L"><InkScroll /><span>读档</span></button>
                  <button onClick={() => openModal('settings')} title="阅读设置"><InkWind /><span>设置</span></button>
                  <button onClick={() => { sound.click('toggle'); setHidden(true); setToolsOpen(false); }} title="隐藏界面 · H"><InkClosedEye /><span>隐藏</span></button>
                </div>
                <button className="reading-toggle" onClick={() => { sound.click('toggle'); setToolsOpen(value => !value); }} aria-expanded={toolsOpen} aria-controls="reading-more" title={toolsOpen ? '收起' : '存档、读档、设置、隐藏'}><InkMore open={toolsOpen} /><span>{toolsOpen ? '收起' : '更多'}</span></button>
              </nav>
            </footer>
          </div>
          {auto && typing.done && !modal && !intro && !hidden && pageVisible && !settings.reducedMotion && <span className="auto-reading-countdown" key={`${beat.id}:${settings.autoDelay}`} aria-hidden="true" style={{ animationDuration: `${autoDelayFor(text, settings.autoDelay)}ms` }} />}
        </section>
        {hidden && <div className="hidden-hint">点击画面，或按 H，继续听故事。</div>}
      </>}

      {beat.kind === 'choice' && <section className={`choices choices--${beat.choices.length}`} aria-label="命运选择"><div className="choice-ornament"><span /><BoatMark /><span /></div><p className="choice-prompt">{beat.prompt}</p><div className={`choice-options ${stamped ? 'is-deciding' : ''}`}>{beat.choices.map((choice, i) => <button className={`choice-option ${choice.disabled ? 'choice-option--locked' : ''} ${stamped === choice.key ? 'is-stamped' : ''}`} key={choice.key} disabled={choice.disabled || (!!stamped && stamped !== choice.key)} onClick={() => pickChoice(choice.key)} aria-keyshortcuts={String(i + 1)} title={`按 ${i + 1} 选择`} style={{ '--choice-index': i } as CSSProperties}><span className="choice-lamp" aria-hidden="true" /><span className="choice-index" aria-hidden="true">{CHOICE_NUMERALS[i] ?? i + 1}</span><span className="choice-copy"><strong>{choice.disabled ? '尚未听见的名字' : choice.title}</strong><small>{choice.disabled ? choice.hint : choice.detail}</small></span><span className="choice-stamp" aria-hidden="true" onAnimationStart={event => stampAtContact(choice.key, event.animationName)}>定</span></button>)}</div>{game.sceneId === '1-12' && <div className="choice-note"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} small /><span>{game.cycle > 1 ? '记忆已经留下。此夜的物件，仍在原处。' : '两条路共享此夜。走过之后，记忆会带你回来。'}</span></div>}<button className="choice-save text-button" onClick={() => openSaves('save')}><InkBookmark size={16} />在分路前，留一枚书签</button></section>}

      {beat.kind === 'ending' && <section className={`ending-screen ending-screen--${beat.ending} ${hidden ? 'ending-screen--clean' : ''}`} aria-label={`结局 · ${ENDINGS[beat.ending].title}`}>
        <span className="ending-ink" aria-hidden="true" /><span className="ending-ripple" aria-hidden="true" />
        <div className="ending-content" inert={hidden} aria-hidden={hidden}>
          <p className="ending-kicker">{beat.ending === 'home' ? '全剧终' : '命运的回声'}</p>
          <div className="ending-stage">
            <span className="ending-seal" aria-hidden="true">{[...(beat.ending === 'home' ? '团圆' : `回声其${ENDING_NUMERALS[ENDINGS[beat.ending].index] ?? ''}`)].map((char, index) => <i key={index}>{char}</i>)}</span>
            <h2 className="ending-title">{ENDINGS[beat.ending].title}</h2>
            <div className="ending-side"><span className="ending-subtitle">{ENDINGS[beat.ending].subtitle}</span><div className="ending-emblem"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} /></div></div>
          </div>
          <EndingQuote text={ENDINGS[beat.ending].quote} />
          <p className="ending-memory">{beat.ending === 'home' ? '故事写到这里，日子还在继续。' : canReturn(profile) ? '两道裂纹相合。那节晚自习，还在等你。' : '这一程，卜骨已经记住。另一条路，仍在灯下。'}</p>
          <div className="ending-actions"><button className="gold-button" onClick={() => { if (beat.ending === 'home') toHome(); else { const nextProfile = completeEnding(game, profile); setProfile(nextProfile); audioJump.current = true; setGame(continueEnding(game, nextProfile)); sound.click('bell'); } }}>{beat.ending === 'home' ? '回到标题' : canReturn(profile) ? '循光归来' : '再赴灯下'}<ArrowRight size={19} strokeWidth={1.2} /></button><button className="ending-secondary text-button" onClick={() => openModal('journal')}>看看留下的记忆 <Feather size={14} /></button></div>
        </div>
        <span className="ending-copyright">异托邦 · {beat.ending === 'home' ? '谢谢你，记住他们。' : '未完的路，留给下一次启程。'}</span>
        {cg && <button className="ending-art-toggle text-button" aria-pressed={hidden} onClick={() => { sound.click('toggle'); setHidden(value => !value); }}>{hidden ? '返回结局' : '静看此景'}</button>}
      </section>}

      {intro && <button className="chapter-intro" data-testid="chapter-intro" onClick={() => setIntro(null)} aria-label="进入故事"><span className="intro-ink" aria-hidden="true" /><span className="intro-ripple" aria-hidden="true" /><span className="intro-scroll"><span className="intro-chapter">{intro.chapter}</span><h2>{intro.title}</h2><span className="intro-subtitle">{intro.subtitle.replace(/\s*·\s*/g, '・')}</span></span><span className="intro-seal" aria-hidden="true">{intro.chapter === '终章' ? '归' : intro.chapter.slice(0, 2)}</span><span className="intro-click">点击，听水声继续。</span></button>}
    </div> : null}

    {modal && <Modal title={modalInfo[modal][0]} eyebrow={modalInfo[modal][1]} seal={modalSeals[modal]} onClose={closeModal} onBack={modalParent ? backModal : undefined} backLabel={modalParent === 'menu' ? '返回小憩' : modalParent ? `返回${modalInfo[modalParent][0]}` : undefined} restoreFocus={restoreModalFocus} notice={toastNotice} className={`modal--${modal}`}>
      <Suspense fallback={<p role="status">正在展开书页…</p>}>
      {modal === 'chapters' && <ChaptersView profile={profile} currentScene={screen === 'play' ? game?.sceneId : undefined} onJump={jump} />}
      {modal === 'characters' && <CharactersView profile={profile} />}
      {modal === 'gallery' && <GalleryView profile={profile} />}
      {modal === 'journal' && <JournalView state={game} profile={profile} initialRelic={journalRelic} />}
      {modal === 'settings' && <SettingsView settings={settings} onChange={changeSettings} onMusic={() => openModal('music')} onExport={() => { exportSave(profile, game, slots); notify('旅途存档已导出。'); }} onImport={file => void importFile(file)} onReset={() => { changeSettings(DEFAULT_SETTINGS); notify('阅读设置已恢复。'); }} />}
      {modal === 'saves' && <SaveView slots={slots} state={game} profile={profile} autosave={loadAutosave()} initialMode={saveMode} onSave={saveSlot} onLoad={state => { resume(state); notify('书页翻回了那一刻。'); }} onDelete={deleteSlot} />}
      {modal === 'history' && <Backlog state={game} profile={profile} onReplay={replay} />}
      {modal === 'menu' && <div className="pause-content"><BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} /><p>不用急。水也可以慢慢流。</p><div className="pause-buttons">{screen === 'play' && <button className="gold-button" onClick={closeModal}>继续此梦 <Play size={15} /></button>}<div className="pause-grid">{LIBRARY.map(item => <button key={item.name} onClick={() => openModal(item.name)}><item.icon size={24} /><span>{item.text}</span><small>{item.note}</small></button>)}</div><div className="pause-rows"><button className="pause-row" onClick={() => openSaves('save')}><InkBookmark />存读档<ChevronRight size={16} /></button><button className="pause-row" onClick={() => openModal('music')}><InkDrop />听水集<ChevronRight size={16} /></button><button className="pause-row" onClick={() => openModal('settings')}><InkWind />阅读设置<ChevronRight size={16} /></button></div>{screen === 'play' && <button className={`pause-row pause-row--home ${confirmHome ? 'is-confirming' : ''}`} onClick={() => { if (confirmHome) toHome(); else setConfirmHome(true); }} aria-live="polite"><InkReturn />{confirmHome ? '再点一次，回到标题' : '回到标题'}<small>{confirmHome ? '此刻已自动留存，可随时续梦' : '此刻已自动留存'}</small></button>}</div></div>}
      {modal === 'about' && <AboutView />}
      {modal === 'music' && <MusicRoom profile={profile} settings={settings} onChange={changeSettings} />}
      </Suspense>
    </Modal>}
    {!modal && toastNotice}
    <UpdateNotice />
    {auto && screen === 'play' && !modal && !intro && beat?.kind === 'text' && <button className="reading-mode-indicator" onClick={toggleAuto}><span />自动阅读中 <Pause size={11} /></button>}
    {isSkipping && screen === 'play' && !modal && <button className="reading-mode-indicator" onClick={stopSkipping}><SkipForward size={12} />已读快进中</button>}
  </main>;
}
