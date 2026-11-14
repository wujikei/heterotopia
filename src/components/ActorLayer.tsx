import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { actorForBeat, actorInCast } from '../actors';
import type { StageActor } from '../actors';
import { ACTOR_LIGHT } from '../data/actorLight';
import { asset } from '../assets';
import { portraitNameFor } from '../data/expressions';
import { ArtImage } from './ArtImage';
import { isDecoded, preloadImage } from '../preload';
import type { Beat, Scene } from '../types';

type Layer = { id: number; sceneId: string; actor: StageActor; phase: 'pending' | 'active' | 'exit'; idle: boolean; cross: boolean; instant: boolean; returning?: boolean };
let mountId = 0;

function ActorFigure({ layer, background, onReady, onError }: {
  layer: Layer; background: string; onReady: (id: number, delayed: boolean) => void; onError: (id: number) => void;
}) {
  const { actor, id } = layer;
  const defaultName = portraitNameFor(actor.character.key);
  const desiredName = portraitNameFor(actor.character.key, actor.expression);
  const url = asset(defaultName);
  const desiredUrl = asset(desiredName);
  const figure = useRef<HTMLDivElement>(null);
  const currentPortrait = useRef(defaultName);
  const request = useRef(0);
  const [portrait, setPortrait] = useState({ current: defaultName, outgoing: '' });
  useLayoutEffect(() => {
    let cancelled = false;
    const started = performance.now();
    const ready = () => {
      // Commit the waiting style before switching. Waiting two animation frames
      // adds visible latency on software-rendered browsers and hidden tabs.
      if (figure.current) getComputedStyle(figure.current).opacity;
      if (!cancelled) onReady(id, performance.now() - started > 1500);
    };
    if (isDecoded(url)) ready();
    else void preloadImage(url).then(() => { if (!cancelled) ready(); }, () => { if (!cancelled) onError(id); });
    return () => { cancelled = true; };
  }, [id, url, onReady, onError]);
  useEffect(() => {
    const generation = ++request.current;
    if (currentPortrait.current === desiredName) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const commit = (name: string) => {
      if (generation !== request.current) return;
      if (currentPortrait.current === name) { setPortrait({ current: name, outgoing: '' }); return; }
      const outgoing = currentPortrait.current;
      currentPortrait.current = name;
      setPortrait({ current: name, outgoing });
      timer = setTimeout(() => {
        if (generation === request.current) setPortrait({ current: name, outgoing: '' });
      }, layer.instant ? 0 : 160);
    };
    void preloadImage(desiredUrl).then(() => commit(desiredName), () => {
      if (desiredName === defaultName) { onError(id); return; }
      const fallbackUrl = asset(defaultName);
      void preloadImage(fallbackUrl).then(() => commit(defaultName), () => onError(id));
    });
    return () => {
      ++request.current;
      if (timer) clearTimeout(timer);
    };
  }, [desiredName, desiredUrl, defaultName, id, onError]);
  const duration = layer.instant ? '0ms' : layer.returning ? '180ms' : layer.phase === 'exit' || layer.cross ? '220ms' : layer.idle ? '180ms' : '400ms';
  const light = ACTOR_LIGHT[background];
  return <div ref={figure} className={`actor actor--${actor.character.key} actor--${layer.phase} ${layer.idle ? 'actor--idle' : 'actor--speaking'} ${layer.cross ? 'actor--cross' : ''} ${light ? `actor--${light}` : ''}`}
    data-mount-id={id} data-actor-state={layer.phase} data-actor-label={actor.label}
    style={{ '--actor-tint': actor.character.color, '--actor-duration': duration, '--expression-duration': layer.instant ? '0ms' : '150ms' } as CSSProperties} aria-hidden="true">
    <div className="actor-glow" />
    {portrait.outgoing && <ArtImage className="actor-portrait actor-portrait--outgoing" name={portrait.outgoing} alt="" decoding="async" />}
    <ArtImage className={`actor-portrait ${portrait.outgoing ? 'actor-portrait--incoming' : ''}`} name={portrait.current} alt="" decoding="async" />
    <span className="actor-vertical-name">{actor.label}</span>
  </div>;
}

/** The stage survives narration. Only decoded replacements can retire its actor. */
export const ActorLayer = memo(function ActorLayer({ beat, scene, beats, reducedMotion, skipping }: {
  beat: Beat; scene: Scene; beats: Beat[]; reducedMotion: boolean; skipping: boolean;
}) {
  const desired = actorForBeat(beat, scene, beats);
  const [layers, setLayers] = useState<Layer[]>([]);
  const latest = useRef({ reducedMotion, skipping, beat });
  latest.current = { reducedMotion, skipping, beat };
  const actorKey = desired?.character.key;
  const label = desired?.label;
  const castKey = desired?.castKey;
  const cast = beat.cast.join(',');

  useLayoutEffect(() => {
    const instant = reducedMotion || skipping;
    setLayers(previous => {
      const sameScene = previous.filter(layer => layer.sceneId === scene.id);
      if (!desired) {
        return sameScene.filter(layer => layer.phase !== 'exit' && (layer.phase !== 'pending' || (beat.kind === 'text' && actorInCast(layer.actor, beat.cast)))).flatMap<Layer>(layer => {
          if (beat.kind === 'text' && actorInCast(layer.actor, beat.cast)) return [{ ...layer, idle: !skipping, instant }];
          return instant || layer.phase === 'pending' ? [] : [{ ...layer, phase: 'exit' as const, idle: false, instant: false }];
        });
      }
      const existing = sameScene.find(layer => layer.actor.character.key === desired.character.key);
      if (existing) {
        return sameScene.flatMap<Layer>(layer => {
          if (layer.id === existing.id) return [{ ...layer, actor: desired, idle: false, returning: layer.idle, instant, cross: true, phase: layer.phase === 'exit' ? 'active' : layer.phase }];
          if (layer.phase === 'exit' || (existing.phase === 'pending' && layer.phase === 'active')) return [layer];
          return existing.phase === 'exit' && !instant ? [{ ...layer, phase: 'exit', idle: false }] : [];
        });
      }
      const current = [...sameScene].reverse().find(layer => layer.phase === 'active');
      return [...(current ? [current] : []), { id: ++mountId, sceneId: scene.id, actor: desired, phase: 'pending', idle: false, cross: !!current, instant }];
    });
    // Only a changed beat/stage decision should touch the layers, not typewriter ticks.
  }, [scene.id, beat.id, beat.kind, actorKey, label, castKey, cast, reducedMotion, skipping]);

  const ready = useCallback((id: number, delayed: boolean) => {
    setLayers(previous => {
      if (!previous.some(layer => layer.id === id && layer.phase === 'pending')) return previous;
      const instant = latest.current.reducedMotion || latest.current.skipping;
      return previous.flatMap<Layer>(layer => layer.id === id
        ? [{ ...layer, phase: 'active' as const, instant, cross: layer.cross || delayed }]
        : instant ? [] : [{ ...layer, phase: 'exit' as const, idle: false, instant: false }]);
    });
  }, []);
  const failed = useCallback((id: number) => {
    setLayers(previous => previous.filter(layer => layer.id !== id).filter(layer => actorInCast(layer.actor, latest.current.beat.cast)));
  }, []);
  useEffect(() => {
    const exiting = layers.filter(layer => layer.phase === 'exit').map(layer => layer.id);
    if (!exiting.length) return;
    const timer = setTimeout(() => setLayers(previous => previous.filter(layer => !exiting.includes(layer.id))), 240);
    return () => clearTimeout(timer);
  }, [layers]);

  return <>{layers.filter(layer => layer.sceneId === scene.id).map(layer => <ActorFigure key={layer.id} layer={layer} background={beat.background} onReady={ready} onError={failed} />)}</>;
});
