import { dateLocale, getLanguage, LANGUAGES, localizePage, t, tr, useLocale } from '../i18n';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, Download, Headphones, Image as ImageIcon, LockKeyhole, RotateCcw, Upload, X } from 'lucide-react';
import { asset, assetSources, BACKGROUNDS, charactersForCampaign, endingsForCampaign, ITEMS, portraitFace, sourceDocument } from '../data/world';
import { SHENCI_STORY } from '../story';
import { campaignOf, hasSeenModernArt } from '../modern';
import { overseasArt, overseasPortrait, overseasThumbnail } from '../overseasArt';
import type { OverseasTone } from '../overseasIdentity';
import { ArtImage } from './ArtImage';
import { RelicArt, RelicCard, RelicStudy } from './RelicStudy';
import { illustratedInventoryItem, relicById, relicForItem, relicUnlocked, seenRelics } from '../data/relics';
import type { Relic, RelicId } from '../data/relics';
import { useModalBack } from './Modal';
import { sound } from '../audio';
import { CGS, cgUnlocked } from '../data/cgs';
import { AVAILABLE_EXTRAS, EXTRAS } from '../data/extras';
import { campaignScenes, canReturn, hasKunlun, hasRoyal, sceneById } from '../engine';
import { isStoryReady, loadStory } from '../story';
import { BoneMark } from './Atmosphere';
import { slotPresentation } from '../savePresentation';
import { presentChapterTitle, presentSceneTitle } from '../editorial';
import type { Campaign, EndingId, GameState, Profile, Route, SaveSlot, Settings } from '../types';

const ROUTES: { key: Route; name: string; subtitle: string; art: string; number: string }[] = [
  { key: 'prologue', name: '水声之前', subtitle: '序章', art: 'school', number: '序' },
  { key: 'common', name: '借来的一口气', subtitle: '共通线', art: 'hut', number: '壹' },
  { key: 'royal', name: '旧玉与故人', subtitle: '王裔线', art: 'palace', number: '贰' },
  { key: 'kunlun', name: '山河未尽', subtitle: '昆仑线', art: 'mountain', number: '叁' },
  { key: 'return', name: '光河与归来', subtitle: '终章', art: 'light-river', number: '归' },
];

export function ChaptersView({ profile, currentScene, onJump }: { profile: Profile; currentScene?: string; onJump: (id: string) => void }) {
  useLocale();
  const SCENES = campaignScenes(campaignOf(profile));
  const routes = campaignOf(profile) !== 'original' ? ROUTES.map(item => item.key === 'prologue' ? { ...item, name: campaignOf(profile) === 'shenci' ? '水声之前' : '问字，不问命', subtitle: '现代卷', art: campaignOf(profile) === 'shenci' ? 'classroom' : 'modern-dorm' } : item.key === 'common' ? { ...item, name: '天问七夜', art: 'river' } : item.key === 'return' ? { ...item, name: '这边的日子', subtitle: '归来与尾声', art: 'modern-sunset' } : item) : ROUTES;
  const [route, setRoute] = useState<Route>(currentScene ? sceneById(currentScene).route : 'prologue');
  const selected = routes.find(item => item.key === route)!;
  const scenes = SCENES.filter(scene => scene.route === route);
  const visited = scenes.filter(scene => profile.visited.includes(scene.id));
  return <div className="chapter-layout">
    <nav className="route-river" aria-label={t("路线")}>
      <svg className="route-river-line" viewBox="0 0 40 500" preserveAspectRatio="none" aria-hidden="true"><path d="M20 0C34 50 6 80 20 125S34 200 20 250 6 330 20 375 34 450 20 500" /></svg>
      {tr(routes.map(item => {
        const all = SCENES.filter(scene => scene.route === item.key);
        const seen = all.filter(scene => profile.visited.includes(scene.id)).length;
        return <button key={item.key} className={`route-stop ${route === item.key ? 'selected' : ''} ${seen ? '' : 'route-stop--unseen'}`} onClick={() => setRoute(item.key)} aria-pressed={route === item.key}>
          <span className="route-node" aria-hidden="true">{item.number}</span>
          <span className="route-copy"><small>{tr(item.subtitle)}</small><strong>{tr(item.name)}</strong><em>{tr(seen ? t("{0} / {1} 场", seen, all.length) : '尚未行至')}</em></span>
        </button>;
      }))}
      <div className="route-memory">{campaignOf(profile) === 'overseas' ? <span className="modern-seal-mark" role="img" aria-label="何字玉扣">何</span> : <BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} small />}<p>{campaignOf(profile) === 'overseas' ? <>第一段旅程结束后，回到现代线。<br />两条路都走完，抵达山顶尾声。</> : <>{t("两条路，同一夜。")}<br />{t("经历会留在卜骨里。")}</>}</p></div>
    </nav>
    <div className="chapter-content">
      <div className="chapter-banner" key={route}>
        <ArtImage className="chapter-banner-art" name={selected.art} alt="" />
        <div className="chapter-banner-copy"><span className="chapter-banner-numeral" aria-hidden="true">{selected.number}</span><div><span className="eyebrow">{tr(selected.subtitle)} {' '}{t("· 已读")}{' '}{tr(visited.length)} / {tr(scenes.length)} {' '}{t("场")}</span><h3>{tr(selected.name)}</h3><p>{tr(route === 'return' && !canReturn(profile) ? '走过王裔与昆仑，两道裂纹才会相合。' : '循着记忆，回到已经走过的地方。')}</p></div></div>
        <div className="chapter-progress" aria-hidden="true"><i style={{ width: `${scenes.length ? visited.length / scenes.length * 100 : 0}%` }} /></div>
      </div>
      <ol className="scene-list">
        {tr(scenes.map((scene, index) => {
          const unlocked = profile.visited.includes(scene.id) || ['0-1','modern-o-0-1','shenci-d-0-1'].includes(scene.id);
          const current = currentScene === scene.id;
          const [time, ...place] = t(presentSceneTitle(scene)).split('·');
          return <li key={scene.id}>{campaignOf(profile) === 'shenci' && (index === 0 || scenes[index-1].chapter !== scene.chapter) && <h4 className="shenci-chapter-label">{scene.chapter}</h4>}<button className={`scene-row ${current ? 'scene-row--current' : ''} ${unlocked ? '' : 'scene-row--locked'}`} disabled={!unlocked} onClick={() => onJump(scene.id)}>
            <span className="scene-row-node" aria-hidden="true" /><span className="scene-row-index">{tr(String(index + 1).padStart(2, '0'))}</span><span className="scene-row-copy"><strong>{tr(place.join(' · ') || time)}</strong><small>{tr(place.length ? time : presentChapterTitle(scene))}{unlocked && scene.sections ? ` · ${scene.sections.length} 节` : null}</small></span><span className="scene-row-status">{tr(!unlocked ? '未至' : current ? '此刻' : <>{t("重游")}<ArrowRight size={15} strokeWidth={1.2} /></>)}</span>
          </button></li>;
        }))}
      </ol>
    </div>
  </div>;
}

export function CharactersView({ profile, tone }: { profile: Profile; tone?: OverseasTone }) {
  useLocale();
  const CHARACTERS = charactersForCampaign(campaignOf(profile));
  const SCENES = campaignScenes(campaignOf(profile));
  const [selected, setSelected] = useState(CHARACTERS[0]);
  const campaign = campaignOf(profile);
  const [storyReady, setStoryReady] = useState(isStoryReady(campaign));
  useEffect(() => {
    if (storyReady || !profile.read.length) return;
    let active = true;
    void loadStory(campaign).then(() => { if (active) setStoryReady(true); }).catch(() => {});
    return () => { active = false; };
  }, [storyReady, profile.read.length, campaign]);
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
  const known = (key: string) => profile.met.includes(key) || key === (campaignOf(profile) === 'overseas' ? 'linyue' : 'shen') || heardExtras.has(key);
  const count = characters.filter(character => known(character.key)).length;
  return <div className="characters-layout">
    <div className="character-gallery">
      <p className="character-hint">{t("记住一个名字，也记住一个人。")}<span>{tr(count)}<i> / {tr(characters.length)}</i></span></p>
      <div className="character-grid">{tr(characters.map((character, index) => {
        const met = known(character.key);
        const portraitTone = character.key === 'linyue' && tone && tone !== 'neutral' ? overseasPortrait(character.key, tone) : undefined;
        return <button className={`character-card ${selected.key === character.key ? 'selected' : ''} ${met ? '' : 'character-card--locked'}`} key={character.key} data-character={character.key} disabled={!met} onClick={() => setSelected(character)} aria-pressed={selected.key === character.key} aria-label={tr(met ? t("{0}，{1}", character.name, character.subtitle) : t("第 {0} 位，尚未相逢", index + 1))}>
          <span className="character-thumb" style={{ '--character-color': character.color } as React.CSSProperties}>{portraitTone ? <ArtImage name={portraitTone} className="overseas-character-thumb" alt="" loading="lazy" /> : <img src={portraitFace(character.key)} alt="" loading="lazy" />}{tr(!met && <span className="character-unknown" aria-hidden="true">？</span>)}</span>
          <span className="character-card-name">{tr(met ? character.name : '未相逢')}</span>
        </button>;
      }))}</div>
    </div>
    <article key={selected.key} className="character-scroll" style={{ '--character-color': selected.color } as React.CSSProperties}>
      <div className="character-portrait-frame"><span className="character-detail-watermark" aria-hidden="true">{selected.name.at(-1)}</span><ArtImage className="character-detail-portrait" name={overseasPortrait(selected.key, tone)} alt={tr(selected.name)} /></div>
      <div className="character-biography">
        <span className="eyebrow">{tr(selected.subtitle)}</span>
        <h3>{tr(selected.name)}{tr(selected.reading && <small>{tr(selected.reading)}</small>)}</h3>
        <p className="character-description">{tr(selected.description)}</p>
        <blockquote>{tr(selected.quote)}</blockquote>
      </div>
    </article>
  </div>;
}

export function GalleryView({ profile, tone }: { profile: Profile; tone?: OverseasTone }) {
  useLocale();
  const [tab, setTab] = useState<'landscapes' | 'cgs'>('landscapes');
  const entries = tab === 'landscapes'
    ? Object.entries(BACKGROUNDS).filter(([key]) => key !== 'classroom-day' && (campaignOf(profile) !== 'original' || !key.includes('modern'))).map(([key, info]) => ({ key, art: key, thumbnail: `${key}-thumb`, ...info, known: hasSeenModernArt(profile, key) }))
    : CGS.filter(cg => !!cg.file && (campaignOf(profile) === 'shenci' ? hasSeenModernArt(profile, cg.file) : cg.id.startsWith('modern-') === (campaignOf(profile) === 'overseas'))).map(cg => ({ key: cg.id, art: cg.file, thumbnail: cg.thumbnail || cg.file, name: cg.title, subtitle: cg.caption, chapter: '旅途留影', known: campaignOf(profile) === 'shenci' ? hasSeenModernArt(profile, cg.file) : cgUnlocked(cg, profile) }));
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
  const viewedArt = viewed ? overseasArt(viewed.art, tone) : '';
  if (viewed) return <div className={`gallery-viewer ${hideCaption ? 'gallery-viewer--clean' : ''}`} data-gallery-art={viewed.art} style={hideCaption ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: 30 } : undefined}>
    <button className="gallery-art-toggle" aria-label={tr(hideCaption ? '退出沉浸看图' : '沉浸看图')} onClick={() => {
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
      <ArtImage className="gallery-full" name={viewedArt} responsive={false} alt={tr(viewed.name)} draggable={false} />
    </button>
    <button className="gallery-back icon-button" onClick={() => setViewing(null)} aria-label={t("返回绘卷")}><X size={19} /><span>{t("返回")}</span></button>
    <div className="gallery-caption"><span className="eyebrow">{tr(viewed.chapter)}</span><h3>{tr(viewed.name)}</h3><p>{tr(viewed.subtitle)}</p><a href={assetSources(viewedArt).webp} download={t("异托邦-{0}.webp", viewed.name)} className="text-button"><Download size={14} />{t("下载此景")}</a><small className="gallery-gesture-hint">{t("轻触画面沉浸观看 · 左右滑动换图")}</small></div>
    {tr(unlocked.length > 1 && <div className="gallery-arrows"><button className="icon-button" onClick={() => move(-1)} aria-label={t("上一张")}><ArrowLeft size={20} /></button><span>{tr(unlocked.findIndex(entry => entry.key === viewing) + 1)} / {tr(unlocked.length)}</span><button className="icon-button" onClick={() => move(1)} aria-label={t("下一张")}><ArrowRight size={20} /></button></div>)}
  </div>;
  return <div className="gallery-content"><div className="tab-bar gallery-tabs" role="tablist" aria-label={t("绘卷分类")}><button role="tab" aria-selected={tab === 'landscapes'} className={tab === 'landscapes' ? 'selected' : ''} onClick={() => setTab('landscapes')}>{t("山河")}</button><button role="tab" aria-selected={tab === 'cgs'} className={tab === 'cgs' ? 'selected' : ''} onClick={() => setTab('cgs')}>{t("留影 · CG")}</button></div><div className="library-intro"><p>{tr(tab === 'landscapes' ? '走过的山河，会在这里留下影子。' : '亲历过的瞬间，才会在卷中展开。')}</p><span>{tr(unlocked.length)} <i>/ {tr(entries.length)}</i></span></div>{tr(!entries.length && <p className="empty-note">{t("下一程的留影，还在水声里。")}</p>)}<div className="gallery-grid">
    {tr(entries.map((info, index) => {
      const { key, known } = info;
      const thumbnail = known ? overseasThumbnail(info.art, info.thumbnail, tone) : info.thumbnail;
      return <button key={key} className={`gallery-card ${!known ? 'gallery-card--locked' : ''}`} disabled={!known} onClick={() => { setViewing(key); setHideCaption(false); }}>
        <div className="gallery-thumbnail">{tr(known ? <ArtImage name={thumbnail} alt={tr(info.name)} loading="lazy" /> : <><ArtImage className="locked-glimpse" name={thumbnail} alt="" loading="lazy" aria-hidden="true" /><span className="locked-landscape" /><LockKeyhole size={20} strokeWidth={1} /></>)}<span className="gallery-index">{tr(String(index + 1).padStart(2, '0'))}</span>{tr(known && <ImageIcon className="gallery-open" size={20} strokeWidth={1} />)}</div><div className="gallery-card-title"><strong>{tr(known ? info.name : '未至之境')}</strong><small>{tr(known ? info.subtitle : '随旅途解锁')}</small></div>
      </button>;
    }))}
  </div></div>;
}

export function JournalView({ state, profile, initialRelic }: { state: GameState | null; profile: Profile; initialRelic?: RelicId }) {
  useLocale();
  const ENDINGS = endingsForCampaign(campaignOf(profile));
  const [tab, setTab] = useState<'bag' | 'relics' | 'endings'>('bag');
  const [selected, setSelected] = useState<Relic | undefined>(() => {
    const relic = initialRelic && relicById(initialRelic);
    return relic && relicUnlocked(relic, profile) ? relic : undefined;
  });
  const opener = useRef<HTMLElement | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const returnScroll = useRef(0);
  useLayoutEffect(() => {
    if (selected && scroll.current) scroll.current.scrollTop = 0;
  }, [selected]);
  const openRelic = (relic: Relic) => {
    opener.current = document.activeElement as HTMLElement;
    returnScroll.current = scroll.current?.scrollTop ?? 0;
    setSelected(relic);
  };
  const back = () => {
    setSelected(undefined);
    requestAnimationFrame(() => {
      if (scroll.current) scroll.current.scrollTop = returnScroll.current;
      const label = opener.current?.getAttribute('aria-label');
      const restored = label ? Array.from(scroll.current?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(button => button.getAttribute('aria-label') === label) : undefined;
      (restored ?? scroll.current?.querySelector<HTMLElement>('.notebook-tabs [aria-selected="true"]'))?.focus({ preventScroll: true });
    });
  };
  useModalBack(() => { if (!selected) return false; back(); return true; });
  const items = (state?.inventory ?? []).filter(id => ITEMS[id] && (!illustratedInventoryItem(id) || relicForItem(id, profile)));
  const relics = seenRelics(profile);
  const ghosts = Math.max(0, 4 - items.length);
  return <div className="journal-content" ref={scroll}>
    <div className="notebook">
      <div className="tab-bar notebook-tabs" role="tablist"><button role="tab" aria-selected={tab === 'bag'} className={tab === 'bag' ? 'selected' : ''} onClick={() => { setTab('bag'); setSelected(undefined); }}>{t("随身之物")}</button><button role="tab" aria-selected={tab === 'relics'} className={tab === 'relics' ? 'selected' : ''} onClick={() => { setTab('relics'); setSelected(undefined); }}>{t("途中物笺")}</button><button role="tab" aria-selected={tab === 'endings'} className={tab === 'endings' ? 'selected' : ''} onClick={() => { setTab('endings'); setSelected(undefined); }}>{t("命运的回声")}<span>{tr(profile.endings.length)} / {Object.keys(ENDINGS).length}</span></button></div>
      <div className={`notebook-page ${selected ? 'notebook-page--study' : tab === 'relics' ? 'notebook-page--relic-index' : ''}`} key={tab}>
        {tr(selected ? <RelicStudy relic={selected} state={state} profile={profile} onSelect={setSelected} onBack={back} /> : tab === 'bag' ? <>
          <div className="bone-panel">{campaignOf(profile) === 'overseas' ? <span className="modern-seal-mark modern-seal-mark--large">何</span> : <BoneMark royal={hasRoyal(profile)} kunlun={hasKunlun(profile)} />}<div><span className="eyebrow">{tr(campaignOf(profile) === 'overseas' ? '两条远行，各自留下记忆' : '卜骨上的两道裂纹')}</span><h3>{tr(canReturn(profile) ? '来处与归处，终于相合。' : hasRoyal(profile) || hasKunlun(profile) ? '另一条路，仍在等你。' : '两条路，共享这一夜。')}</h3><p>{campaignOf(profile) === 'overseas' ? '回到宿舍，掌心仍留着“何”字。' : t("记忆留存，物件归于此夜原样。")}<br />{campaignOf(profile) === 'overseas' ? (profile.endings.some(id => id.startsWith('modern-royal-')) ? '王裔那条路，你已经走过。' : '王裔那条路，还没有走过。') : tr(profile.oldNames ? '那十根旧队名简，你已经问过。' : '有些名字，还没有被听见。')}</p><div className="bone-legend"><span className={hasRoyal(profile) ? 'is-lit' : ''}>{tr(campaignOf(profile) === 'overseas' ? '第一条 · 王裔' : '第一道 · 王裔')}{' '}{tr(hasRoyal(profile) && <Check size={12} />)}</span><span className={hasKunlun(profile) ? 'is-lit' : ''}>{tr(campaignOf(profile) === 'overseas' ? '第二条 · 昆仑' : '第二道 · 昆仑')}{' '}{tr(hasKunlun(profile) && <Check size={12} />)}</span></div></div></div>
          <h4 className="section-label">{t("此刻，行囊里")}</h4>
          <div className="inventory-grid">
            {tr(items.map(id => {
              const relic = relicForItem(id, profile);
              const copy = <div><h4>{tr(ITEMS[id].name)}</h4><p>{tr(ITEMS[id].detail)}</p>{tr(relic && <small className="item-study-hint">{t("细看此物")}{' '}<ArrowRight size={12} /></small>)}</div>;
              return relic ? <button className="inventory-item inventory-item--illustrated" key={id} data-inventory-item={id} aria-label={tr(t("细看{0}", ITEMS[id].name))} onClick={() => openRelic(relic)}><RelicArt relic={relic} profile={profile} />{tr(copy)}</button> : <div className="inventory-item" key={id}><span className="item-seal">{tr(ITEMS[id].mark)}</span>{tr(copy)}</div>;
            }))}
            {tr(Array.from({ length: ghosts }, (_, i) => <div className="inventory-item inventory-item--ghost" key={`ghost-${i}`} aria-hidden="true"><span className="item-seal">{tr(['图', '玉', '简', '笛'][i % 4])}</span><div><h4>{t("尚未拾得")}</h4><p>{tr(items.length || i ? '路上还会遇见。' : '行囊还轻。先走到故事里去吧。')}</p></div></div>))}
          </div>
          {tr(!items.length && <p className="empty-note">{t("行囊还轻。先走到故事里去吧。")}</p>)}
        </> : tab === 'relics' ? <><div className="relic-index-heading"><span className="eyebrow">{t("所见，所记")}</span><h3>{t("让旧物，留住人的温度。")}</h3><p>{t("行囊会变，见过的模样留在这里。")}</p></div><div className="relic-grid">{tr(relics.map(relic => <RelicCard key={relic.group} relic={relic} state={state} profile={profile} onOpen={() => openRelic(relic)} />))}</div>{tr(!relics.length && <p className="empty-note">{t("还没有记下的物件。")}<br />{t("先走到故事里去吧。")}</p>)}</> : <div className="endings-grid">{tr(Object.entries(ENDINGS).map(([id, ending]) => {
          const known = profile.endings.includes(id as EndingId);
          return <div className={`ending-card ${known ? 'ending-card--known' : ''}`} key={id} style={{ '--glimpse': `url("${asset(`${ending.background}-thumb`)}")` } as React.CSSProperties}><span className="ending-roman" aria-hidden="true">{tr(ending.index)}</span>{tr(!known && <LockKeyhole className="ending-lock" size={16} strokeWidth={1.2} />)}<small>{tr(known ? ending.subtitle : '一页未尽的命运')}</small><h3>{tr(known ? ending.title : '未闻')}</h3><p>{tr(known ? ending.quote : '亲历之后，才能记住。')}</p></div>;
        }))}</div>)}
      </div>
    </div>
  </div>;
}

export function SaveView({ slots, state, profile, initialMode, onSave, onLoad, onDelete, autosave }: { slots: (SaveSlot | null)[]; state: GameState | null; profile: Profile; initialMode: 'save' | 'load'; onSave: (index: number) => void; onLoad: (state: GameState) => void; onDelete: (index: number) => void; autosave: GameState | null }) {
  useLocale();
  const [mode, setMode] = useState(initialMode);
  const [confirmation, setConfirmation] = useState<{ index: number; action: 'overwrite' | 'delete' } | null>(null);
  const date = (value: string) => new Intl.DateTimeFormat(dateLocale(), { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const wrapWords = ['en','de'].includes(getLanguage());
  const excerptLimit = wrapWords ? 80 : 20;
  const cards = slots.map(slot => {
    if (!slot) return null;
    const presentation = slotPresentation(slot.state, profile, localizePage, excerptLimit, wrapWords);
    const { background } = presentation;
    return { ...presentation, thumbnail: overseasThumbnail(background, `${background}-thumb`, slot.state.overseasIdentity?.tone) };
  });
  const recent = autosave ? slotPresentation(autosave, profile, localizePage, excerptLimit, wrapWords) : null;
  return <div className="save-content" onPointerDownCapture={event => {
    if (confirmation && event.target instanceof Element && event.target.closest('.save-slot')?.getAttribute('data-slot') !== String(confirmation.index)) setConfirmation(null);
  }} onBlurCapture={event => {
    if (confirmation && event.relatedTarget instanceof Element && !event.relatedTarget.closest(`[data-slot="${confirmation.index}"]`)) setConfirmation(null);
  }}><div className="tab-bar"><button className={mode === 'save' ? 'selected' : ''} onClick={() => { setMode('save'); setConfirmation(null); }}>{t("留存此刻")}</button><button className={mode === 'load' ? 'selected' : ''} onClick={() => { setMode('load'); setConfirmation(null); }}>{t("重续旧梦")}</button><span className="tab-description">{tr(mode === 'save' ? '六处书签，留住六个瞬间。' : '路线记忆与已读记录会继续保留。')}</span></div>
    {tr(mode === 'load' && autosave && recent && <button className="autosave-row" onClick={() => onLoad(autosave)}><RotateCcw size={18} strokeWidth={1.3} /><span><strong>{t("最近一次 · 自动留存")}</strong><small>{tr(recent.chapter)} / {tr(recent.title)}</small></span><ArrowRight size={18} strokeWidth={1} /></button>)}
    <div className="save-grid">{tr(slots.map((slot, index) => <div className={`save-slot ${slot ? 'save-slot--filled' : ''} ${confirmation?.index === index ? 'save-slot--confirm' : ''}`} key={index} data-slot={index}><span className="save-tassel" aria-hidden="true" />
      <button className="save-slot-main" disabled={mode === 'load' ? !slot : !state} onClick={() => { if (mode === 'load' && slot) onLoad(slot.state); else if (slot && !(confirmation?.index === index && confirmation.action === 'overwrite')) setConfirmation({ index, action: 'overwrite' }); else { onSave(index); setConfirmation(null); } }}>
        <div className="save-slot-image">{tr(slot ? <img src={asset(cards[index]!.thumbnail)} alt="" /> : <><span className="empty-slot-mark">{t("卷")}</span><span>{t("尚未落笔")}</span></>)}<span className="save-slot-number">{tr(String(index + 1).padStart(2, '0'))}</span>{tr(confirmation?.index === index && <span className="save-overwrite" id={`save-confirm-${index}`} role="status">{tr(confirmation.action === 'delete' ? '再点一次叉号，移除这枚书签' : '再点一次，替换这枚书签')}</span>)}</div>
        <div className="save-slot-info"><strong>{tr(slot ? cards[index]!.title : '空白书签')}</strong><small>{tr(slot ? t("{0} · {1}", cards[index]!.chapter, date(slot.savedAt)) : mode === 'save' ? '在这里留下此刻' : '尚无可续的梦')}</small>{tr(cards[index]?.excerpt && <p className="save-slot-excerpt">{tr(cards[index]!.excerpt)}</p>)}</div>
      </button>{tr(slot && <button className={`save-delete ${confirmation?.index === index && confirmation.action === 'delete' ? 'save-delete--confirm' : ''}`} onClick={() => {
        if (confirmation?.index === index && confirmation.action === 'delete') { onDelete(index); setConfirmation(null); }
        else setConfirmation({ index, action: 'delete' });
      }} aria-label={tr(t("{0}移除书签 {1}", confirmation?.index === index && confirmation.action === 'delete' ? '确认' : '', index + 1))} aria-describedby={confirmation?.index === index ? `save-confirm-${index}` : undefined}><X size={16} /></button>)}
    </div>))}</div><p className="save-footnote"><ArrowDownToLine size={13} /> {' '}{t("进度会自动保存在当前浏览器；也可在设置中导出存档。")}</p>
  </div>;
}

export function SettingsView({ settings, onChange, onExport, onImport, onReset, onMusic, languagePending, languageError }: { languagePending: Settings['language'] | null; languageError: boolean; settings: Settings; onChange: (settings: Settings) => void; onExport: () => void; onImport: (file: File) => void; onReset: () => void; onMusic: () => void }) {
  useLocale();
  const input = useRef<HTMLInputElement>(null);
  const slider = (key: 'textSpeed' | 'autoDelay' | 'fontSize' | 'musicVolume' | 'ambienceVolume' | 'sfxVolume', label: string, min: number, max: number, description: string, unit: string) => <label className="setting-row"><span><strong>{tr(label)}</strong><small>{tr(description)}</small></span><div className="range-control"><input aria-label={tr(label)} type="range" min={min} max={max} value={settings[key]} style={{ '--range-fill': `${(settings[key] - min) / (max - min) * 100}%` } as React.CSSProperties} onChange={event => onChange({ ...settings, [key]: Number(event.target.value) })} onPointerUp={() => { if (key === 'sfxVolume') sound.click('preview'); }} onKeyUp={event => { if (key === 'sfxVolume' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) sound.click('preview'); }} /><output>{tr(key === 'textSpeed' && settings[key] === 0 ? '即现' : key === 'autoDelay' ? settings[key] <= 3 ? '较快' : settings[key] >= 8 ? '较慢' : '适中' : t("{0}{1}", settings[key], unit))}</output></div></label>;
  const toggle = (key: 'reducedMotion' | 'showSprites' | 'muted' | 'lightweight' | 'autoAfterChoice', label: string, description: string) => <div className="setting-row"><span><strong>{tr(label)}</strong><small>{tr(description)}</small></span><button type="button" className={`toggle ${settings[key] ? 'toggle--on' : ''}`} role="switch" aria-checked={settings[key]} aria-label={tr(label)} onClick={() => { sound.click('toggle'); onChange({ ...settings, [key]: !settings[key] }); }}><span /></button></div>;
  return <div className="settings-content"><div className="setting-language"><label htmlFor="reading-language">{t('语言')}</label><select id="reading-language" value={languagePending ?? settings.language} disabled={!!languagePending} onChange={event => onChange({ ...settings, language: event.target.value as Settings['language'] })}>{LANGUAGES.map(item => <option key={item.id} value={item.id} lang={item.html}>{item.name}</option>)}</select><span role={languageError ? 'alert' : 'status'}>{languagePending ? t('正在切换语言…') : languageError ? t('语言切换失败，请重试。') : ''}</span></div><div className="settings-columns"><section><h3 className="section-label">{t("阅读 · 按自己的节奏")}</h3>{tr(slider('textSpeed', '文字显现', 0, 65, '调到最左侧可立即显示全文', '字/秒'))}{tr(slider('autoDelay', '自动节奏', 2, 10, '快 ↔ 慢，长句会多留一点时间', ''))}{tr(toggle('autoAfterChoice', '选择后继续自动阅读', '作出选择后，沿用之前的自动阅读节奏'))}{tr(slider('fontSize', '正文字号', 17, 29, '把字调到舒服的大小', 'px'))}{tr(toggle('showSprites', '人物立绘', '让说话的人出现在画面中'))}{tr(toggle('reducedMotion', '减弱动态', '减少粒子、镜头移动与转场'))}{tr(toggle('lightweight', '轻量模式', '开启使用较小背景；关闭呈现原画细节'))}</section><section><h3 className="section-label">{t("听觉 · 一条河的声音")}</h3>{tr(slider('musicVolume', '配乐音量', 0, 100, '原声随旅途渐次展开', '%'))}{tr(slider('ambienceVolume', '环境音量', 0, 100, '水声、风声与灶边的微响', '%'))}{tr(slider('sfxVolume', '音效音量', 0, 100, '纸页、铜铃与脚下的一步', '%'))}{tr(toggle('muted', '静音', '暂时把声音放轻'))}<button className="text-button settings-music-link" onClick={onMusic}><Headphones size={16} strokeWidth={1.2} />{t("听水集 · 原声重听")}<ArrowRight size={14} /></button><div className="settings-note"><span>{t("戴上耳机，")}</span><p>{t("听水从远处来，也听人慢慢说话。")}</p></div></section></div><div className="settings-footer"><div className="settings-transfer"><button className="text-button" onClick={onExport}><Download size={15} />{t("导出旅途")}</button><button className="text-button" onClick={() => input.current?.click()}><Upload size={15} />{t("导入存档")}</button><input ref={input} type="file" accept="application/json,.json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ''; }} /></div><button className="text-button quiet" onClick={onReset}><RotateCcw size={14} />{t("恢复阅读设置")}</button></div><div className="keyboard-reference" aria-label={t("阅读快捷键")}><span><kbd>Space</kbd> / <kbd>Enter</kbd> {' '}{t("继续 / 显示全文")}</span><span><kbd>←</kbd> / <kbd>PageUp</kbd> {' '}{t("回看 / 上滑")}</span><span><kbd>A</kbd> {' '}{t("自动阅读")}</span><span><kbd>Ctrl</kbd> {' '}{t("按住跳过已读")}</span><span><kbd>1–6</kbd> {' '}{t("选择纸签")}</span><span><kbd>S</kbd> {' '}{t("存档 /")}{' '}<kbd>L</kbd> {' '}{t("读档")}</span><span><kbd>H</kbd> {' '}{t("隐藏界面")}</span><span><kbd>F</kbd> {' '}{t("全屏")}</span><span><kbd>Esc</kbd> {' '}{t("菜单 / 逐层返回")}</span></div></div>;
}

export function AboutView({ campaign }: { campaign: Campaign }) {
  useLocale();
  const credits: [string, string][] = [['原著剧本', '用户提供'], ['场景与人物美术', '本机 Qwen-Image 2.1'], ['原声配乐', campaign === 'overseas' ? '本机 ACE-Step 1.5 · 现代卷原创配乐' : '本机 ACE-Step 1.5 · 十一首'], ['环境与音效', '本作程序化声音设计'], ['中文字体', 'Noto Serif SC · 霞鹜文楷 LXGW WenKai'], ['字体授权', 'SIL Open Font License']];
  return <div className="about-content">
    <div className="about-hero"><span className="about-seal" aria-hidden="true">{getLanguage() === 'en' || getLanguage() === 'de' ? 'HT' : '异托'}</span><div className="about-title">{t("异托邦")}</div></div>
    <blockquote>{t("看路，也看看走路的人。")}</blockquote>
    <p>{campaign === 'overseas' ? '一部关于异乡求学、文化隔阂与重新理解自己的现代故事。' : t("一部关于远行、记忆与回家的楚地奇幻视觉小说。")}</p>
    <p>{campaign === 'overseas' ? '跟随林越从旧街问字摊出发，经历王裔与昆仑两条古代旅程，两次回到现代生活，最终来到山顶。' : campaign === 'shenci' ? '改编自新版《异托邦》完整剧情：沈辞的国内序章、天问七夜、王裔与昆仑、两次现代返场与登山尾声。V6 旧版和旧存档独立保留。' : t("改编自《异托邦 V6 完整剧本》，保留序章、共通线、王裔线、昆仑线与归来的完整故事，以及跨路线记忆与四个王裔结局。")}</p>
    <div className="about-stats">{campaign === 'overseas' ? <><span><strong>2</strong>条古代旅程</span><span><strong>2</strong>次回到现代</span><span><strong>1</strong>段山顶尾声</span></> : <><span><strong>{campaign === 'shenci' ? SHENCI_STORY.sceneCount : 81}</strong>{t("场故事")}</span><span><strong>2</strong>{t("条命运")}</span><span><strong>6</strong>{t("页回声")}</span></>}</div>
    <dl className="about-credit">{tr(credits.map(([role, name]) => <div key={role}><dt>{tr(role)}</dt><dd>{tr(name)}</dd></div>))}</dl>
    <a className="text-button about-source" href={sourceDocument(campaign)} download={campaign === 'overseas' ? '林越海外现代线-原著剧本.txt' : campaign === 'shenci' ? '异托邦-沈辞新版-原著剧本.txt' : '异托邦-V6-原著剧本.txt'}>{t("阅读原著剧本")}{' '}<ArrowRight size={15} /></a>
  </div>;
}
