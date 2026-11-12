import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Headphones, LoaderCircle, LockKeyhole, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../audio';
import { audioAsset, MUSIC_BY_SCENE, SOUNDTRACK, TRACK_ART, trackById, unlockedTracks } from '../score';
import { SCENES } from '../engine';
import type { MusicId } from '../score';
import { asset } from '../data/world';
import type { Profile, Settings } from '../types';
import { BoatMark } from './Atmosphere';

/** 未解锁的曲子：提示在哪一章能听见，而不是一句笼统的“随旅途解锁”。 */
const unlockHint = (id: MusicId) => {
  const scene = SCENES.find(item => MUSIC_BY_SCENE[item.id] === id);
  return scene ? `行至「${scene.chapter.split(' ').at(-1)}」可闻` : '随旅途解锁';
};
const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function MusicRoom({ profile, settings, onChange }: { profile: Profile; settings: Settings; onChange: (value: Settings) => void }) {
  const state = useSyncExternalStore(sound.subscribe, sound.getSnapshot);
  const unlocked = unlockedTracks(profile);
  const [selected, setSelected] = useState<MusicId>(() => state.preview ?? (state.track && unlocked.includes(state.track) ? state.track : 'river-home'));
  const [position, setPosition] = useState(0);
  const track = trackById(selected);
  const index = SOUNDTRACK.findIndex(item => item.id === selected);
  const previewing = state.preview === selected;
  const transportPlaying = previewing && !state.previewPaused && !state.error;
  const playing = previewing && !state.previewPaused && state.playing;
  const loading = state.loading && previewing;

  useEffect(() => () => sound.endPreview(), []);
  useEffect(() => {
    setPosition(sound.position(selected));
    const timer = window.setInterval(() => setPosition(sound.position(selected)), 250);
    return () => clearInterval(timer);
  }, [selected]);

  const play = (id: MusicId) => {
    const pause = state.preview === id && !state.previewPaused && !state.error;
    setSelected(id);
    if (pause) { sound.togglePreview(id); return; }
    const audible = { ...settings, muted: false };
    if (settings.muted) onChange(audible);
    void sound.unlock(audible);
    sound.togglePreview(id, true);
  };
  const step = (direction: number) => {
    const available = SOUNDTRACK.filter(item => unlocked.includes(item.id));
    const current = available.findIndex(item => item.id === selected);
    play(available[(current + direction + available.length) % available.length].id);
  };
  const toggleMute = () => {
    const next = { ...settings, muted: !settings.muted };
    onChange(next); if (!next.muted) void sound.unlock(next);
  };

  return <div className="music-room">
    <div className="music-room-grid">
      <section className={`music-cover ${playing ? 'music-cover--playing' : ''}`} aria-label="所选曲目">
        <img key={selected} className="music-cover-art" src={asset(TRACK_ART[selected])} alt="" />
        <div className="music-cover-shade" />
        <div className="music-cover-top"><span>循水归来 · 原声</span><span>第 {String(index + 1).padStart(2, '0')} 支</span></div>
        <div className="music-orbit" aria-hidden="true"><span /><span /><BoatMark /></div>
        <div className="music-cover-copy"><h3>{track.title}</h3><p>{track.subtitle}</p><div className="music-cover-status"><span className={`sound-wave ${playing && !settings.reducedMotion ? 'sound-wave--playing' : ''}`} aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <i key={i} style={{ animationDelay: `${i * -.17}s` }} />)}</span><span>{loading ? '曲子正沿水声而来' : settings.muted ? '此刻静默' : playing ? '正在试听' : previewing ? '此刻稍歇' : state.track === selected && state.playing ? '当前场景配乐' : '把这段旅途，再听一遍'}</span></div></div>
      </section>
      <section className="music-track-section" aria-label="原声曲目">
        <div className="music-track-intro"><p>走过的路，留在声音里。</p><span>{unlocked.length}<i> / {SOUNDTRACK.length}</i></span></div>
        <div className="music-track-list">{SOUNDTRACK.map((item, i) => {
          const known = unlocked.includes(item.id);
          const active = item.id === selected;
          const audible = state.track === item.id && state.playing;
          return <button key={item.id} className={`music-track ${active ? 'music-track--selected' : ''} ${known ? '' : 'music-track--locked'}`} disabled={!known} onClick={() => play(item.id)} aria-label={known ? `试听《${item.title}》` : `第 ${i + 1} 首，${unlockHint(item.id)}`} aria-pressed={active}>
            <span className="music-track-index">{known && audible ? <span className={`sound-wave ${!settings.reducedMotion ? 'sound-wave--playing' : ''}`} aria-hidden="true"><i /><i /><i /></span> : String(i + 1).padStart(2, '0')}</span>
            <span className="music-track-copy"><strong>{known ? item.title : '未闻之曲'}</strong><small>{known ? item.subtitle : unlockHint(item.id)}</small></span>
            {known ? <><span className="music-track-duration">{stamp(item.seconds)}</span><span className="music-track-action" aria-hidden="true">{active && transportPlaying ? <Pause size={15} /> : <Play size={15} strokeWidth={1.3} />}</span></> : <span className="music-track-ripple" aria-hidden="true"><LockKeyhole size={14} strokeWidth={1.2} /></span>}
          </button>;
        })}</div>
      </section>
    </div>
    <footer className="music-player">
      <div className="music-player-progress"><span>{stamp(position)}</span><div className="music-progress-track"><progress aria-label="试听进度" value={Math.min(position, track.seconds)} max={track.seconds} /><i className="music-progress-boat" style={{ left: `${Math.min(100, position / track.seconds * 100)}%` }} aria-hidden="true" /></div><span>{stamp(track.seconds)}</span></div>
      <div className="music-player-controls">
        <div className="music-transport"><button className="music-step" onClick={() => step(-1)} disabled={unlocked.length < 2} aria-label="上一首"><SkipBack size={20} strokeWidth={1.3} /></button><button className={`music-play ${transportPlaying ? 'is-playing' : ''}`} onClick={() => play(selected)} aria-label={transportPlaying ? '暂停试听' : `播放《${track.title}》`}>{loading ? <LoaderCircle size={26} className="music-loading" /> : transportPlaying ? <Pause size={26} strokeWidth={1.5} /> : <Play size={26} strokeWidth={1.5} />}</button><button className="music-step" onClick={() => step(1)} disabled={unlocked.length < 2} aria-label="下一首"><SkipForward size={20} strokeWidth={1.3} /></button></div>
        <div className="music-volume"><button className="music-step music-step--small" onClick={toggleMute} aria-label={settings.muted ? '开启试听声音' : '静音试听'}>{settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input type="range" min="0" max="100" value={settings.musicVolume} aria-label="试听配乐音量" style={{ '--range-fill': `${settings.musicVolume}%` } as React.CSSProperties} onChange={event => onChange({ ...settings, musicVolume: Number(event.target.value) })} /><span>{settings.musicVolume}%</span></div>
        <a className="music-download text-button" href={audioAsset(track.file)} download={`异托邦-${String(index + 1).padStart(2, '0')}-${track.title}.mp3`}><Download size={15} />收藏此曲</a>
      </div>
      <p className={`music-player-note ${state.error ? 'music-player-note--error' : ''}`} role="status">{state.error ?? <><Headphones size={14} strokeWidth={1.2} />十一首原声，随旅途解锁 · 关闭后继续当前故事的配乐</>}</p>
    </footer>
  </div>;
}
