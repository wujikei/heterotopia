import { t, tr, useLocale } from '../i18n';
import { AudioButton } from './AudioButton';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Headphones, LoaderCircle, LockKeyhole, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../audio';
import { audioAsset, MUSIC_BY_SCENE, SOUNDTRACK, TRACK_ART, trackById, unlockedTracks } from '../score';
import { SCENES } from '../engine';
import type { MusicId } from '../score';
import { ArtImage } from './ArtImage';
import type { Profile, Settings } from '../types';
import { BoatMark } from './Atmosphere';

/** 未解锁的曲子：提示在哪一章能听见，而不是一句笼统的“随旅途解锁”。 */
const unlockHint = (id: MusicId) => {
  const scene = SCENES.find(item => MUSIC_BY_SCENE[item.id] === id);
  return scene ? t("行至「{0}」可闻", scene.chapter.split(' ').at(-1)) : '随旅途解锁';
};
const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function MusicRoom({ profile, settings, onChange }: { profile: Profile; settings: Settings; onChange: (value: Settings) => void }) {
  useLocale();
  const state = useSyncExternalStore(sound.subscribe, sound.getSnapshot);
  const unlocked = [...new Set([...unlockedTracks(profile), ...(state.track ? [state.track] : []), ...(state.loadingTrack ? [state.loadingTrack] : [])])];
  const selected = state.preview ?? state.loadingTrack ?? state.track ?? 'river-home';
  const [position, setPosition] = useState(0);
  const track = trackById(selected);
  const index = SOUNDTRACK.findIndex(item => item.id === selected);
  const previewing = state.preview === selected;
  const playing = state.track === selected && state.playing;
  const loading = state.loading && state.loadingTrack === selected;

  useEffect(() => () => sound.endPreview(), []);
  useEffect(() => {
    setPosition(sound.position(selected));
    const timer = window.setInterval(() => setPosition(sound.position(selected)), 250);
    return () => clearInterval(timer);
  }, [selected]);

  const play = (id: MusicId) => {
    const pause = state.track === id && state.playing;
    if (pause) { sound.togglePreview(id); return; }
    const audible = { ...settings, muted: false };
    sound.togglePreview(id, true);
    if (settings.muted) onChange(audible);
    void sound.unlock(audible);
  };
  const step = (direction: number) => {
    const available = SOUNDTRACK.filter(item => unlocked.includes(item.id));
    const current = available.findIndex(item => item.id === selected);
    play(available[(current + direction + available.length) % available.length].id);
  };
  const toggleMute = () => {
    if (!settings.muted && state.needsGesture) { void sound.unlock(settings); return; }
    const next = { ...settings, muted: !settings.muted };
    onChange(next); if (!next.muted) void sound.unlock(next);
  };

  return <div className="music-room">
    <div className="music-room-grid">
      <section className={`music-cover ${playing ? 'music-cover--playing' : ''}`} aria-label={t("所选曲目")}>
        <ArtImage key={selected} className="music-cover-art" name={TRACK_ART[selected]} alt="" />
        <div className="music-cover-shade" />
        <div className="music-cover-top"><span>{t("循水归来 · 原声")}</span><span>{t("第")}{' '}{tr(String(index + 1).padStart(2, '0'))} {' '}{t("支")}</span></div>
        <div className="music-orbit" aria-hidden="true"><span /><span /><BoatMark /></div>
        <div className="music-cover-copy"><h3>{tr(track.title)}</h3><p>{tr(track.subtitle)}</p><div className="music-cover-status"><span className={`sound-wave ${playing && !settings.reducedMotion ? 'sound-wave--playing' : ''}`} aria-hidden="true">{tr([0, 1, 2, 3, 4].map(i => <i key={i} style={{ animationDelay: `${i * -.17}s` }} />))}</span><span>{tr(loading ? '曲子正沿水声而来' : settings.muted ? '此刻静默' : playing ? (previewing ? '正在试听' : '当前场景配乐') : previewing ? '此刻稍歇' : '把这段旅途，再听一遍')}</span></div></div>
      </section>
      <section className="music-track-section" aria-label={t("原声曲目")}>
        <div className="music-track-intro"><p>{t("走过的路，留在声音里。")}</p><span>{tr(unlocked.length)}<i> / {tr(SOUNDTRACK.length)}</i></span></div>
        <div className="music-track-list">{tr(SOUNDTRACK.map((item, i) => {
          const known = unlocked.includes(item.id);
          const active = item.id === selected;
          const audible = state.track === item.id && state.playing;
          return <AudioButton key={item.id} className={`music-track ${active ? 'music-track--selected' : ''} ${known ? '' : 'music-track--locked'}`} disabled={!known} onClick={() => play(item.id)} aria-label={tr(known ? t("试听《{0}》", item.title) : t("第 {0} 首，{1}", i + 1, unlockHint(item.id)))} aria-pressed={active}>
            <span className="music-track-index">{tr(known && audible ? <span className={`sound-wave ${!settings.reducedMotion ? 'sound-wave--playing' : ''}`} aria-hidden="true"><i /><i /><i /></span> : String(i + 1).padStart(2, '0'))}</span>
            <span className="music-track-copy"><strong>{tr(known ? item.title : '未闻之曲')}</strong><small>{tr(known ? item.subtitle : unlockHint(item.id))}</small></span>
            {tr(known ? <><span className="music-track-duration">{tr(stamp(item.seconds))}</span><span className="music-track-action" aria-hidden="true">{tr(audible ? <Pause size={15} /> : <Play size={15} strokeWidth={1.3} />)}</span></> : <span className="music-track-ripple" aria-hidden="true"><LockKeyhole size={14} strokeWidth={1.2} /></span>)}
          </AudioButton>;
        }))}</div>
      </section>
    </div>
    <footer className="music-player">
      <div className="music-player-progress"><span>{tr(stamp(position))}</span><div className="music-progress-track"><input className="music-seek" type="range" min="0" max={track.seconds} step="0.1" value={Math.min(position, track.seconds)} aria-label={t("试听位置")} onChange={event => { const next = Number(event.target.value); sound.seek(selected, next); setPosition(next); }} /><progress aria-label={t("试听进度")} value={Math.min(position, track.seconds)} max={track.seconds} /><i className="music-progress-boat" style={{ left: `${Math.min(100, position / track.seconds * 100)}%` }} aria-hidden="true" /></div><span>{tr(stamp(track.seconds))}</span></div>
      <div className="music-player-controls">
        <div className="music-transport"><AudioButton className="music-step" onClick={() => step(-1)} disabled={unlocked.length < 2} aria-label={t("上一首")}><SkipBack size={20} strokeWidth={1.3} /></AudioButton><AudioButton className={`music-play ${playing ? 'is-playing' : ''}`} onClick={() => play(selected)} aria-label={tr(playing ? '暂停试听' : t("播放《{0}》", track.title))}>{tr(loading ? <LoaderCircle size={26} className="music-loading" /> : playing ? <Pause size={26} strokeWidth={1.5} /> : <Play size={26} strokeWidth={1.5} />)}</AudioButton><AudioButton className="music-step" onClick={() => step(1)} disabled={unlocked.length < 2} aria-label={t("下一首")}><SkipForward size={20} strokeWidth={1.3} /></AudioButton></div>
        <div className="music-volume"><AudioButton className="music-step music-step--small" onClick={toggleMute} aria-label={tr(settings.muted ? '开启试听声音' : state.needsGesture ? '点击开启试听声音' : '静音试听')}>{tr(settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />)}</AudioButton><input type="range" min="0" max="100" value={settings.musicVolume} aria-label={t("试听配乐音量")} style={{ '--range-fill': `${settings.musicVolume}%` } as React.CSSProperties} onChange={event => onChange({ ...settings, musicVolume: Number(event.target.value) })} /><span>{tr(settings.musicVolume)}%</span></div>
        <a className="music-download text-button" href={audioAsset(track.file)} download={t("异托邦-{0}-{1}.mp3", String(index + 1).padStart(2, '0'), track.title)}><Download size={15} />{t("下载此曲")}</a>
      </div>
      <p className={`music-player-note ${state.error ? 'music-player-note--error' : ''}`} role="status">{tr(state.needsGesture && !settings.muted ? '点击开启声音' : state.error ?? <><Headphones size={14} strokeWidth={1.2} />{t("十一首原声，随旅途解锁 · 关闭后继续当前故事的配乐")}</>)}</p>
    </footer>
  </div>;
}
