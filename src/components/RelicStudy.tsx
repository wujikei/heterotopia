import { t, tr, useLocale } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { ArtImage } from './ArtImage';
import { hasKunlun, hasRoyal } from '../engine';
import { RELICS, relicHeld, relicUnlocked } from '../data/relics';
import type { Relic } from '../data/relics';
import type { GameState, Profile } from '../types';

/** The optional drawing fails quietly; the title and screenplay remain readable. */
export function RelicArt({ relic, profile, className = '' }: { relic: Relic; profile: Profile; className?: string }) {
  useLocale();
  return <RelicDrawing key={relic.art} relic={relic} profile={profile} className={className} />;
}

function RelicDrawing({ relic, profile, className }: { relic: Relic; profile: Profile; className: string }) {
  useLocale();
  const [failed, setFailed] = useState(false);
  const [decoded, setDecoded] = useState(false);
  return <span className={`relic-art ${className} ${failed ? 'relic-art--missing' : ''}`} data-relic-art={relic.id}>
    <span className="relic-art-mark" aria-hidden="true">{relic.mark}</span>
    {tr(!failed && <ArtImage name={relic.art} responsive={false} alt="" draggable={false} onLoad={() => setDecoded(true)} onError={event => {
      // ArtImage retries the preferred format as WebP. Only remove the optional
      // illustration after that fallback also fails; never loop broken images.
      if (/\.webp(?:$|\?)/.test(event.currentTarget.currentSrc)) setFailed(true);
    }} />)}
    {tr(relic.id === 'bone' && decoded && !failed && <svg className="relic-bone-light" viewBox="0 0 1024 1024" fill="none" aria-hidden="true">
      <path className={hasRoyal(profile) ? 'is-lit' : ''} d="M515 573 490 533 466 506 474 480 440 444 432 411 403 390" />
      <path className={hasKunlun(profile) ? 'is-lit' : ''} d="M515 573 548 608 540 641 565 675 550 715 560 744" />
    </svg>)}
  </span>;
}

export function RelicCard({ relic, state, profile, onOpen }: { relic: Relic; state: GameState | null; profile: Profile; onOpen: () => void }) {
  useLocale();
  return <button className="relic-card" onClick={onOpen} data-relic-card={relic.id} aria-label={tr(t("细看{0}", relic.title))}>
    <RelicArt relic={relic} profile={profile} />
    <span className="relic-card-copy"><small>{tr(relicHeld(relic, state) ? '此刻随身' : '途中所见')}</small><strong>{tr(relic.title)}</strong><span>{tr(relic.material)}</span></span>
    <ArrowUpRight className="relic-card-arrow" size={15} aria-hidden="true" />
  </button>;
}

export function RelicStudy({ relic, state, profile, onSelect, onBack }: { relic: Relic; state: GameState | null; profile: Profile; onSelect: (relic: Relic) => void; onBack: () => void }) {
  useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const versions = RELICS.filter(item => item.group === relic.group && relicUnlocked(item, profile));
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [relic.id]);
  return <article className="relic-study" data-relic-study={relic.id}>
    <div className="relic-study-toolbar"><button className="text-button" onClick={onBack}><ArrowLeft size={15} />{t("返回手记")}</button><span>{tr(relicHeld(relic, state) ? '此刻随身' : '途中所见')}</span></div>
    <div className="relic-study-layout">
      <figure className="relic-study-plate"><span className="relic-plate-mark" aria-hidden="true">{relic.mark}</span><RelicArt relic={relic} profile={profile} /><figcaption>{tr(relic.material)}</figcaption></figure>
      <div className="relic-study-copy"><span className="eyebrow">{t("旅人手记 · 物笺")}</span><h3 tabIndex={-1} ref={heading}>{tr(relic.title)}</h3><p>{tr(relic.detail)}</p><blockquote>{tr(relic.quote)}</blockquote><small className="relic-source">{t("记于")}{' '}{tr(relic.source)}</small>
        {tr(relic.id === 'bone' && <div className="relic-memory"><span className={hasRoyal(profile) ? 'is-lit' : ''}>{t("第一道 · 王裔")}{' '}{tr(hasRoyal(profile) ? '已记' : '未尽')}</span><span className={hasKunlun(profile) ? 'is-lit' : ''}>{t("第二道 · 昆仑")}{' '}{tr(hasKunlun(profile) ? '已记' : '未尽')}</span></div>)}
        {tr(versions.length > 1 && <div className="relic-versions" role="group" aria-label={t("已经见过的形态")}>{tr(versions.map(item => <button key={item.id} aria-pressed={item.id === relic.id} onClick={() => onSelect(item)}>{tr(item.title)}</button>))}</div>)}
      </div>
    </div>
  </article>;
}
