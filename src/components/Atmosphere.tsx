import { useEffect, useRef, useState } from 'react';
import { asset } from '../data/world';

export function SceneArt({ name, motion = true }: { name: string; motion?: boolean }) {
  const [loaded, setLoaded] = useState(name);
  const [previous, setPrevious] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setLoaded(current => { if (current !== name) setPrevious(current); return name; });
    };
    image.src = asset(name);
    return () => { cancelled = true; };
  }, [name]);
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => setPrevious(null), 1700);
    return () => clearTimeout(timer);
  }, [previous, loaded]);
  return <div className={`scene-art ${motion ? 'scene-art--motion' : ''}`} aria-hidden="true">
    {previous && <div className="scene-image scene-image--previous" style={{ backgroundImage: `url("${asset(previous)}")` }} />}
    <div key={loaded} className="scene-image scene-image--current" style={{ backgroundImage: `url("${asset(loaded)}")` }} />
    <div className="scene-shade" />
    <div className="scene-grain" />
  </div>;
}

export function Atmosphere({ scene, reduced = false }: { scene: string; reduced?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let width = 0, height = 0, frame = 0, animation = 0;
    const snow = scene === 'snow' || scene === 'mountain';
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
  return <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M9 34c7 5 23 5 30 0M24 8v25M13 28 24 9l11 19H13Z" stroke="currentColor" strokeWidth="1.15" />
    <path d="M5 39c5-2 8 2 13 0s8 2 13 0 8 2 12 0" stroke="currentColor" strokeWidth=".8" opacity=".6" />
    <circle cx="35.5" cy="12.5" r="3" fill="currentColor" opacity=".7" />
  </svg>;
}

export function BoneMark({ royal, kunlun, small = false }: { royal: boolean; kunlun: boolean; small?: boolean }) {
  return <svg className={`bone-mark ${small ? 'bone-mark--small' : ''}`} viewBox="0 0 100 100" fill="none" aria-label={`卜骨：王裔${royal ? '已完成' : '未完成'}，昆仑${kunlun ? '已完成' : '未完成'}`}>
    <path d="M50 6 87 27v46L50 94 13 73V27L50 6Z" stroke="currentColor" strokeWidth=".65" opacity=".55" />
    <path d="M50 14 80 31v38L50 86 20 69V31L50 14Z" stroke="currentColor" strokeWidth=".5" opacity=".25" />
    <path d="M50 25v51M35 38l15 12 14-12M37 65l13-15 13 15" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
    <path d="M50 50 29 29l8-5-7-9" className={royal ? 'bone-crack bone-crack--lit' : 'bone-crack'} />
    <path d="M50 50 70 69l-6 9 8 8" className={kunlun ? 'bone-crack bone-crack--lit' : 'bone-crack'} />
    <circle cx="50" cy="50" r="3" fill="currentColor" opacity={royal && kunlun ? 1 : 0.4} />
  </svg>;
}
