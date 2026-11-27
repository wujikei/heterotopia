import { t, tr, useLocale } from '../i18n';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { asset } from '../data/world';
import { artQuality, subscribeArtQuality, artViewport, subscribeArtViewport, avifEnabled, subscribeArtFormat, assetSources, imageUrl } from '../assets';
import { preloadImage } from '../preload';
import { overseasArt } from '../overseasArt';
import { MODERN_PHOTO_ART } from '../modern';
import type { OverseasTone } from '../overseasIdentity';

type ArtLayer = { name: string; url: string; composition?: 'portrait' };
const portraitCompositions = new Set(['cg-modern-summit-r4', 'cg-modern-porridge-plaque', MODERN_PHOTO_ART]);

export function SceneArt({ name, motion = true, cg, readingId, blackout = false, tone, onPhotoVisible }: { name: string; motion?: boolean; cg?: string; readingId: string | null; blackout?: boolean; tone?: OverseasTone; onPhotoVisible: (visible: boolean) => void }) {
  useLocale();
  useSyncExternalStore(subscribeArtQuality, artQuality, () => false);
  useSyncExternalStore(subscribeArtFormat, avifEnabled, () => false);
  useSyncExternalStore(subscribeArtViewport, artViewport, () => 'false:false');
  const art = useRef<HTMLDivElement>(null);
  const target = cg || name;
  const artwork = overseasArt(target, tone);
  const selected = asset(artwork);
  const [{ loaded, previous }, setLayers] = useState<{ loaded: ArtLayer | null; previous: ArtLayer | null }>({ loaded: null, previous: null });
  useEffect(() => {
    let cancelled = false;
    const clearOldArt = () => setLayers(current => current.loaded?.name === target ? current : { loaded: null, previous: null });
    // Keep the crossfade for ready artwork. Long requests can finish without
    // making dialogue play against the previous location indefinitely.
    const timer = setTimeout(clearOldArt, 1250);
    const show = async () => {
      const background = overseasArt(name, tone);
      const sources = new Map([
        [artwork, target],
        [target, target],
        [background, name],
        [name, name],
      ]);
      for (const [candidate, sceneArt] of sources) {
        if (cancelled) return;
        try {
          const mobile = portraitCompositions.has(sceneArt) || sceneArt.startsWith('cg-modern-hike-') ? assetSources(candidate).mobile : undefined;
          const url = await preloadImage(candidate === artwork ? selected : asset(candidate), 'high');
          if (cancelled) return;
          const portrait = mobile && [mobile.webp, mobile.avif].some(source => source && imageUrl(source) === url);
          const next: ArtLayer = { name: sceneArt, url, composition: portrait ? 'portrait' : undefined };
          clearTimeout(timer);
          setLayers(current => current.loaded?.url === next.url && current.loaded.name === next.name ? current : { loaded: next, previous: current.loaded });
          return;
        } catch { /* Try the next available version. */ }
      }
      if (!cancelled) clearOldArt();
    };
    void show();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [target, artwork, selected, name, tone]);
  const photoVisible = !blackout && loaded?.name === MODERN_PHOTO_ART;
  useEffect(() => onPhotoVisible(photoVisible), [onPhotoVisible, photoVisible]);
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => setLayers(current => ({ ...current, previous: null })), 1700);
    return () => clearTimeout(timer);
  }, [previous]);
  useEffect(() => {
    const element = art.current;
    if ((!target.endsWith('-r2') && !target.startsWith('cg-modern-')) || readingId === null) {
      element?.style.removeProperty('--r2-reading-top');
      return;
    }
    const text = document.querySelector('.dialogue-text');
    if (!element || !text) return;
    // A detached/unlaid-out reading node is not a measured zero-height art region.
    let active = true;
    const measure = () => {
      if (!active || !text.isConnected || !text.getClientRects().length) return;
      const top = text.getBoundingClientRect().top - element.getBoundingClientRect().top;
      if (top > 0) element.style.setProperty('--r2-reading-top', `${top}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    observer.observe(text.closest('.dialogue') ?? text);
    window.addEventListener('resize', measure);
    const frame = requestAnimationFrame(measure);
    void document.fonts.ready.then(measure);
    return () => { active = false; observer.disconnect(); window.removeEventListener('resize', measure); cancelAnimationFrame(frame); };
  }, [target, loaded?.url, readingId]);
  if (blackout) return <div key="blackout" ref={art} className="scene-art scene-art--blackout" data-art="blackout" aria-hidden="true" />;
  return <div ref={art} data-art={loaded?.name} data-composition={loaded?.composition} className={`scene-art ${loaded?.name.startsWith('cg-') ? 'scene-art--cg' : ''} ${motion ? 'scene-art--motion' : ''}`} aria-hidden="true">
    {tr(previous && <div className="scene-image scene-image--previous" data-art={previous.name} data-composition={previous.composition} style={{ backgroundImage: `url("${previous.url}")` }} />)}
    {tr(loaded && <div key={loaded.url} className="scene-image scene-image--current" data-art={loaded.name} style={{ backgroundImage: `url("${loaded.url}")` }} />)}
    <div className="scene-shade" />
    <div className="scene-grain" />
  </div>;
}

export function Atmosphere({ scene, reduced = false }: { scene: string; reduced?: boolean }) {
  useLocale();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let width = 0, height = 0, frame = 0, animation = 0;
    const snow = scene === 'snow' || scene === 'snow-night' || scene === 'mountain';
    const fire = ['hut', 'ritual', 'ruins', 'cave'].includes(scene);
    const particles = Array.from({ length: snow ? 65 : 32 }, () => ({
      x: Math.random(), y: Math.random(), radius: Math.random() * (snow ? 1.7 : 1.3) + 0.5,
      speed: Math.random() * 0.6 + 0.15, phase: Math.random() * Math.PI * 2,
    }));
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y += (snow ? 0.00037 : fire ? -0.00024 : -0.00007) * p.speed;
        p.x += Math.sin(frame * 0.003 + p.phase) * 0.000025;
        if (p.y < -0.01) p.y = 1.01;
        if (p.y > 1.01) p.y = -0.01;
        const alpha = (0.2 + Math.sin(frame * 0.015 + p.phase) * 0.16) * (snow ? 1 : 0.65);
        context.fillStyle = snow ? `rgba(225,237,236,${alpha})` : fire ? `rgba(230,167,93,${alpha})` : `rgba(223,212,163,${alpha})`;
        context.beginPath(); context.arc(p.x * width, p.y * height, p.radius, 0, Math.PI * 2); context.fill();
      }
      frame++;
      animation = requestAnimationFrame(draw);
    };
    animation = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animation); window.removeEventListener('resize', resize); };
  }, [scene, reduced]);
  return <canvas ref={ref} className="atmosphere" aria-hidden="true" />;
}

export function BoatMark({ className = '' }: { className?: string }) {
  useLocale();
  return <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M9 34c7 5 23 5 30 0M24 8v25M13 28 24 9l11 19H13Z" stroke="currentColor" strokeWidth="1.15" />
    <path d="M5 39c5-2 8 2 13 0s8 2 13 0 8 2 12 0" stroke="currentColor" strokeWidth=".8" opacity=".6" />
    <circle cx="35.5" cy="12.5" r="3" fill="currentColor" opacity=".7" />
  </svg>;
}

export function BoneMark({ royal, kunlun, small = false }: { royal: boolean; kunlun: boolean; small?: boolean }) {
  useLocale();
  return <svg className={`bone-mark ${small ? 'bone-mark--small' : ''}`} viewBox="0 0 100 100" fill="none" aria-label={tr(t("卜骨：王裔{0}，昆仑{1}", royal ? '已完成' : '未完成', kunlun ? '已完成' : '未完成'))}>
    <path d="M50 6 87 27v46L50 94 13 73V27L50 6Z" stroke="currentColor" strokeWidth=".65" opacity=".55" />
    <path d="M50 14 80 31v38L50 86 20 69V31L50 14Z" stroke="currentColor" strokeWidth=".5" opacity=".25" />
    <path d="M50 25v51M35 38l15 12 14-12M37 65l13-15 13 15" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
    <path d="M50 50 29 29l8-5-7-9" className={royal ? 'bone-crack bone-crack--lit' : 'bone-crack'} />
    <path d="M50 50 70 69l-6 9 8 8" className={kunlun ? 'bone-crack bone-crack--lit' : 'bone-crack'} />
    <circle cx="50" cy="50" r="3" fill="currentColor" opacity={royal && kunlun ? 1 : 0.4} />
  </svg>;
}
