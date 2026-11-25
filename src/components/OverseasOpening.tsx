import { useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { t, useLocale } from '../i18n';
import { DEFAULT_OVERSEAS_IDENTITY, OVERSEAS_TONES, OVERSEAS_TRADITIONS } from '../overseasIdentity';
import type { OverseasOpeningIdentity } from '../overseasIdentity';
import { registeredArtwork } from '../assets';
import { overseasPortrait } from '../overseasArt';
import { ArtImage } from './ArtImage';
import { sound } from '../audio';
import { useModalBack } from './Modal';
import './OverseasOpening.css';

export default function OverseasOpening({ initial, loading, onBegin }: {
  initial?: OverseasOpeningIdentity;
  loading: boolean;
  onBegin: (identity: OverseasOpeningIdentity) => void;
}) {
  useLocale();
  const [identity, setIdentity] = useState(initial ?? DEFAULT_OVERSEAS_IDENTITY);
  const [step, setStep] = useState<'appearance' | 'tradition'>('appearance');
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const chosenTone = OVERSEAS_TONES.find(({ id }) => id === identity.tone)!;
  const canSelectTone = (tone: OverseasOpeningIdentity['tone']) => tone === 'neutral' || registeredArtwork(`portrait-linyue-overseas-${tone}`);
  const moveTo = (target: typeof step) => {
    setStep(target);
    requestAnimationFrame(() => {
      body.current?.scrollTo(0, 0);
      heading.current?.focus({ preventScroll: true });
    });
  };
  useModalBack(() => {
    if (loading) return true;
    if (step === 'appearance') return false;
    moveTo('appearance');
    return true;
  });

  return <div className="overseas-opening">
    <div className="overseas-opening__body" ref={body}>
      {step === 'appearance' ? <>
        <h3 ref={heading} tabIndex={-1}>{t('选择林越的形象')}</h3>
        <div className="overseas-opening__portraits" role="group" aria-label={t('选择林越的形象')}>
          {OVERSEAS_TONES.map(({ id, label }) => <button
            className="overseas-opening__portrait" key={id} type="button"
            aria-pressed={identity.tone === id} disabled={loading || !canSelectTone(id)}
            onClick={() => { sound.click('choice'); setIdentity(value => ({ ...value, tone: id })); }}
          >
            <span className="overseas-opening__picture"><ArtImage name={overseasPortrait('linyue', id)} className="overseas-opening__art" alt="" decoding="async" /></span>
            <span className="overseas-opening__label">{t(label)}{identity.tone === id && <Check size={16} aria-hidden="true" />}</span>
          </button>)}
        </div>
      </> : <>
        <h3 ref={heading} tabIndex={-1}>{t('选择林越熟悉的文化传统')}</h3>
        <div className="overseas-opening__traditions" role="group" aria-label={t('选择林越熟悉的文化传统')}>
          {OVERSEAS_TRADITIONS.map(({ id, label, detail }) => <button
            key={id} type="button" className="overseas-opening__tradition"
            aria-pressed={identity.tradition === id} disabled={loading}
            onClick={() => { sound.click('choice'); setIdentity(value => ({ ...value, tradition: id })); }}
          >
            <span className="overseas-opening__label">{t(label)}{identity.tradition === id && <Check size={16} aria-hidden="true" />}</span>
            <span className="overseas-opening__detail">{t(detail)}</span>
          </button>)}
        </div>
      </>}
    </div>
    <footer className="overseas-opening__footer">
      {step === 'tradition' && <button type="button" className="overseas-opening__back" disabled={loading} aria-label={t('返回形象选择')} onClick={() => { sound.click('page'); moveTo('appearance'); }}>
        <ChevronLeft size={18} aria-hidden="true" />{t(chosenTone.label)}
      </button>}
      {step === 'appearance'
        ? <button type="button" className="gold-button" onClick={() => { sound.click('page'); moveTo('tradition'); }}>{t('选择文化传统')}<ArrowRight size={18} aria-hidden="true" /></button>
        : <button type="button" className="gold-button" disabled={loading} onClick={() => onBegin(identity)}>
          {loading ? t('正在载入旅途…') : t('带着这个问题启程')}<ArrowRight size={18} aria-hidden="true" />
        </button>}
    </footer>
  </div>;
}
