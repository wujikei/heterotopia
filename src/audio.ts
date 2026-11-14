import { audioAsset, scoreFrame, trackById, UI_EFFECTS } from './score';
import type { AmbienceId, Effect, MusicId, ScoreFrame, UiSoundKind } from './score';
import type { Settings } from './types';

type Bus = 'music' | 'ambience' | 'sfx';
interface Voice {
  file: string; bus: Bus; key: string; level: number; startedAt: number; offset: number; seconds: number;
  source?: AudioBufferSourceNode; node?: GainNode; pan?: StereoPannerNode; media?: HTMLAudioElement;
  timer?: number; startTimer?: number; fadeTimer?: number; stopped?: boolean; event?: string;
}
export interface AudioState {
  unlocked: boolean; available: boolean; track: MusicId | null; preview: MusicId | null;
  previewPaused: boolean; playing: boolean; loading: boolean; error: string | null;
}
interface DirectOptions { suppressEffects?: boolean; discontinuous?: boolean; blocked?: boolean; dimmed?: boolean; skipping?: boolean }

// Site-owned files, or embedded data URLs in the offline edition. Inference
// services are never contacted while the game is running.
export class Soundscape {
  private context?: AudioContext;
  private buses?: Record<Bus, GainNode>;
  private settings?: Settings;
  private activated = false;
  private mediaSupported = true;
  private frame: ScoreFrame = scoreFrame('', null);
  private options: DirectOptions = {};
  private musicVoice?: Voice;
  private musicTarget?: MusicId | null;
  private musicRequest = 0;
  private ambience = new Map<AmbienceId, Voice>();
  private ambienceTargets = new Map<AmbienceId, number>();
  private ambienceRequests = new Map<AmbienceId, number>();
  private serial = 0;
  private active = new Set<Voice>();
  private cache = new Map<string, { buffer: AudioBuffer; bytes: number; used: number }>();
  private loading = new Map<string, Promise<AudioBuffer>>();
  private cacheClock = 0;
  private seen = new Set<string>();
  private pendingEvents = new Set<string>();
  private eventStarts = new Map<string, number>();
  private cueGeneration = 0;
  private previewId: MusicId | null = null;
  private previewPaused = false;
  private previewOffset = 0;
  private lastPageClick = 0;
  private uiRequest = 0;
  private listeners = new Set<() => void>();
  private state: AudioState = { unlocked: false, available: true, track: null, preview: null, previewPaused: false, playing: false, loading: false, error: null };

  readonly subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  readonly getSnapshot = () => this.state;

  private publish(patch: Partial<AudioState>): void {
    if (Object.entries(patch).every(([key, value]) => this.state[key as keyof AudioState] === value)) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }

  private clock(): number { return this.context?.currentTime ?? performance.now() / 1000; }

  async unlock(settings: Settings): Promise<void> {
    if (!this.activated) {
      this.activated = true;
      const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Context) {
        try {
          this.context = new Context();
          this.buses = { music: this.context.createGain(), ambience: this.context.createGain(), sfx: this.context.createGain() };
          const limiter = this.context.createDynamicsCompressor();
          limiter.threshold.value = -6; limiter.knee.value = 5; limiter.ratio.value = 6;
          limiter.attack.value = .006; limiter.release.value = .22;
          const master = this.context.createGain(); master.gain.value = .88;
          Object.values(this.buses).forEach(bus => { bus.gain.value = 0; bus.connect(limiter); });
          limiter.connect(master); master.connect(this.context.destination);
        } catch { this.context = undefined; this.buses = undefined; }
      }
      document.addEventListener('visibilitychange', this.visibility);
      if (!this.context) {
        this.mediaSupported = typeof Audio !== 'undefined' && !!new Audio().canPlayType('audio/mpeg');
        if (!this.mediaSupported) this.publish({ available: false, error: '当前浏览器暂时无法播放音频，仍可继续阅读。' });
      }
    }
    // Resume inside the gesture, before fetching or decoding assets.
    const resume = this.context && this.context.state !== 'running' && this.context.state !== 'closed'
      ? this.context.resume().catch(() => {}) : Promise.resolve();
    this.update(settings);
    await resume;
    this.publish({ unlocked: this.context ? this.context.state === 'running' : this.mediaSupported });
    if (this.context?.state === 'running') this.publish({ available: true, playing: !!this.musicVoice && !settings.muted && !document.hidden });
  }

  update(settings: Settings): void {
    const wasMuted = this.settings?.muted;
    this.settings = settings;
    if (this.buses && this.context) {
      for (const bus of ['music', 'ambience', 'sfx'] as Bus[]) this.buses[bus].gain.setTargetAtTime(this.busLevel(bus), this.context.currentTime, .035);
    }
    this.refreshMediaVolumes();
    if (settings.muted) {
      this.cancelEvents();
      this.frame.events.forEach(event => this.seen.add(event.id));
    }
    if (this.activated && (!settings.muted || wasMuted !== settings.muted)) this.sync();
    this.publish({ playing: !!this.musicVoice && this.state.available && !settings.muted && !document.hidden });
  }

  direct(frame: ScoreFrame, options: DirectOptions = {}): void {
    const sceneChanged = frame.scene !== this.frame.scene;
    const cueChanged = frame.cue !== this.frame.cue;
    if (sceneChanged || cueChanged || options.discontinuous || options.skipping || options.blocked && !this.options.blocked) this.cancelEvents();
    if (sceneChanged || options.discontinuous) { this.seen.clear(); this.eventStarts.clear(); }
    this.frame = frame; this.options = options;
    if (options.suppressEffects || options.discontinuous || options.skipping || this.settings?.muted) frame.events.forEach(event => this.seen.add(event.id));
    if (this.activated) this.sync();
  }

  private sync(): void {
    if (!this.settings || !this.activated || !this.context && !this.mediaSupported) return;
    // Fast-forward keeps one bed and does not fetch every passing cue.
    if (!this.options.skipping || this.previewId) { this.syncMusic(); this.syncAmbience(); }
    if (this.settings.muted || this.options.blocked || this.options.skipping || this.previewId || document.hidden) return;
    for (const event of this.frame.events) {
      if (!event.id || this.seen.has(event.id) || this.pendingEvents.has(event.id)) continue;
      if (!event.effects.length) { this.seen.add(event.id); continue; }
      this.pendingEvents.add(event.id);
      const generation = this.cueGeneration, origin = this.clock() + .06;
      let started = false;
      void Promise.all(event.effects.map(async effect => {
        const guard = () => generation === this.cueGeneration && !this.options.blocked && !this.options.skipping && !this.previewId && !this.settings?.muted && !document.hidden;
        const voice = await this.effect(effect, origin, guard, event.id);
        if (voice) {
          started = true; this.seen.add(event.id);
          this.eventStarts.set(event.id, Math.min(this.eventStarts.get(event.id) ?? Infinity, voice.startedAt));
        }
      })).finally(() => {
        if (generation === this.cueGeneration) {
          this.pendingEvents.delete(event.id);
          if (!started && !this.options.blocked) this.seen.add(event.id);
        }
      });
    }
  }

  private musicChoice(): MusicId | null { return this.previewId ? this.previewPaused ? null : this.previewId : this.frame.music; }

  private syncMusic(): void {
    const desired = this.musicChoice();
    const gain = this.previewId ? 1 : this.frame.musicGain * (this.options.dimmed ? .68 : 1);
    const transition = this.previewId ? .7 : this.frame.transition;
    if (this.musicVoice?.key === desired) {
      if (this.musicTarget !== desired) ++this.musicRequest;
      this.musicTarget = desired;
      if (this.musicVoice.level !== gain) this.fade(this.musicVoice, gain, Math.max(1, transition));
      this.publish({ loading: false, track: desired, error: null });
      return;
    }
    if (this.musicTarget === desired) return;
    const token = ++this.musicRequest;
    this.musicTarget = desired;
    if (!desired) {
      if (this.musicVoice) this.retire(this.musicVoice, this.previewId ? .45 : transition);
      this.musicVoice = undefined;
      this.publish({ playing: false, loading: false, track: null });
      return;
    }
    if (this.settings?.muted) { this.musicTarget = undefined; return; }
    // The alarm cuts the dream immediately. Other transitions wait for decoding.
    if (transition < .3 && this.musicVoice) { this.retire(this.musicVoice, transition); this.musicVoice = undefined; }
    this.publish({ loading: true, error: null });
    const track = trackById(desired);
    const offset = this.previewId === desired ? this.previewOffset : 0;
    void this.makeVoice(track.file, 'music', desired, true, offset, () => token === this.musicRequest, undefined, track.seconds)
      .then(voice => {
        if (!voice) {
          if (token === this.musicRequest) { this.musicTarget = undefined; this.publish({ loading: false }); }
          return;
        }
        const previous = this.musicVoice;
        this.musicVoice = voice;
        this.fade(voice, this.previewId ? 1 : this.frame.musicGain * (this.options.dimmed ? .68 : 1), transition < .3 ? 2.8 : Math.max(1.2, transition));
        if (previous) this.retire(previous, transition);
        for (const old of this.active) if (old.bus === 'music' && old !== voice && old !== previous) this.retire(old, .12, true);
        this.publish({ loading: false, track: desired, playing: !this.settings?.muted && !document.hidden, available: true, error: null });
        this.trimCache();
      }).catch(() => {
        if (token !== this.musicRequest) return;
        this.musicTarget = undefined;
        this.publish({ loading: false, error: '这首曲子暂时未能载入，点击播放可重试。' });
      });
  }

  private syncAmbience(): void {
    const wanted = this.previewId ? [] : this.frame.ambience;
    this.ambienceTargets = new Map(wanted);
    for (const [id, voice] of this.ambience) {
      if (this.ambienceTargets.has(id)) continue;
      this.retire(voice, 2.6); this.ambience.delete(id);
    }
    for (const id of this.ambienceRequests.keys()) if (!this.ambienceTargets.has(id)) this.ambienceRequests.delete(id);
    for (const [id, level] of wanted) {
      const gain = level * (this.options.dimmed ? .65 : 1);
      const existing = this.ambience.get(id);
      if (existing) { if (existing.level !== gain) this.fade(existing, gain, 2.8); continue; }
      if (this.ambienceRequests.has(id) || this.settings?.muted) continue;
      const token = ++this.serial;
      this.ambienceRequests.set(id, token);
      const guard = () => this.ambienceRequests.get(id) === token && this.ambienceTargets.has(id);
      void this.makeVoice(`amb-${id}.mp3`, 'ambience', id, true, 0, guard, undefined, 24).then(voice => {
        if (!voice) { if (this.ambienceRequests.get(id) === token) this.ambienceRequests.delete(id); return; }
        this.ambienceRequests.delete(id);
        this.ambience.set(id, voice);
        this.fade(voice, (this.ambienceTargets.get(id) ?? 0) * (this.options.dimmed ? .65 : 1), 3.2);
        this.trimCache();
      }).catch(() => { if (this.ambienceRequests.get(id) === token) this.ambienceRequests.delete(id); });
    }
  }

  private async buffer(file: string): Promise<AudioBuffer> {
    const cached = this.cache.get(file);
    if (cached) { cached.used = ++this.cacheClock; return cached.buffer; }
    const pending = this.loading.get(file);
    if (pending) return pending;
    const task = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 25_000);
      try {
        const response = await fetch(audioAsset(file), { signal: controller.signal });
        if (!response.ok) throw new Error('Audio unavailable');
        const bytes = await response.arrayBuffer();
        const buffer = await this.context!.decodeAudioData(bytes);
        this.cache.set(file, { buffer, bytes: buffer.length * buffer.numberOfChannels * 4, used: ++this.cacheClock });
        this.trimCache();
        return buffer;
      } finally { clearTimeout(timeout); this.loading.delete(file); }
    })();
    this.loading.set(file, task);
    return task;
  }

  private trimCache(): void {
    let total = [...this.cache.values()].reduce((sum, item) => sum + item.bytes, 0);
    const pinned = new Set([...this.active].map(voice => voice.file));
    const entries = [...this.cache.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [file, entry] of entries) {
      if (total <= 48 * 1024 * 1024) break;
      if (pinned.has(file) || this.loading.has(file)) continue;
      this.cache.delete(file); total -= entry.bytes;
    }
  }

  private async makeVoice(file: string, bus: Bus, key: string, loop: boolean, offset: number,
                          guard: () => boolean, start?: number, loopSeconds?: number, pan = 0): Promise<Voice | undefined> {
    if (!guard()) return;
    if (this.context && this.buses) {
      const buffer = await this.buffer(file);
      if (!guard() || this.context.state === 'closed') return;
      const source = this.context.createBufferSource(); source.buffer = buffer; source.loop = loop;
      const seconds = Math.min(loopSeconds ?? buffer.duration, buffer.duration);
      if (loop) { source.loopStart = 0; source.loopEnd = seconds; }
      const node = this.context.createGain(); node.gain.value = 0;
      source.connect(node);
      let panner: StereoPannerNode | undefined;
      if (pan && this.context.createStereoPanner) { panner = this.context.createStereoPanner(); panner.pan.value = pan; node.connect(panner); panner.connect(this.buses[bus]); }
      else node.connect(this.buses[bus]);
      const at = Math.max(this.context.currentTime + .02, start ?? 0);
      const voice: Voice = { file, bus, key, source, node, pan: panner, level: 0, startedAt: at, offset, seconds };
      source.onended = () => this.cleanup(voice);
      this.active.add(voice);
      source.start(at, offset % seconds);
      return voice;
    }
    // Media fallback for embedded browsers that omit Web Audio.
    const media = new Audio(audioAsset(file)); media.loop = loop; media.preload = 'auto'; media.volume = 0;
    const voice: Voice = { file, bus, key, media, level: 0, startedAt: start ?? this.clock(), offset, seconds: loopSeconds ?? 0 };
    media.addEventListener('loadedmetadata', () => {
      voice.seconds = loopSeconds ?? media.duration;
      if (offset && Number.isFinite(media.duration)) media.currentTime = offset % media.duration;
    }, { once: true });
    media.addEventListener('ended', () => this.cleanup(voice), { once: true });
    media.addEventListener('error', () => {
      this.cleanup(voice);
      if (bus === 'music') this.publish({ available: false, playing: false, loading: false, error: '当前浏览器暂时无法播放音频，仍可继续阅读。' });
    }, { once: true });
    this.active.add(voice);
    const play = async () => {
      voice.startTimer = undefined;
      if (!guard() || voice.stopped) { this.cleanup(voice); return; }
      try {
        await media.play();
        if (!guard() || voice.stopped) this.cleanup(voice);
      } catch {
        this.cleanup(voice);
        if (bus === 'music') this.publish({ available: false, playing: false, loading: false, error: '点击播放，开启声音。' });
      }
    };
    const delay = Math.max(0, (start ?? this.clock()) - this.clock());
    if (delay > .025) voice.startTimer = window.setTimeout(() => void play(), delay * 1000);
    else if (loop) await play();
    else void play();
    return this.active.has(voice) && guard() ? voice : undefined;
  }

  private fade(voice: Voice, target: number, seconds: number): void {
    voice.level = target;
    if (voice.node && this.context) {
      const param = voice.node.gain, now = this.context.currentTime;
      const from = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(from, now);
      if (seconds < .025) { param.setValueAtTime(target, now); return; }
      // Piecewise ramps approximate equal-power curves without the uninterruptible
      // setValueCurveAtTime events found in several Firefox/WebKit backends.
      for (let i = 1; i <= 32; i++) {
        const t = i / 32;
        const value = from < .0001 ? target * Math.sin(t * Math.PI / 2)
          : target === 0 ? from * Math.cos(t * Math.PI / 2)
          : from + (target - from) * (.5 - .5 * Math.cos(t * Math.PI));
        param.linearRampToValueAtTime(value, now + seconds * t);
      }
      return;
    }
    if (voice.media) {
      clearInterval(voice.fadeTimer);
      const from = Number(voice.media.dataset.level ?? 0), at = performance.now();
      const step = () => {
        const t = seconds ? Math.min(1, (performance.now() - at) / (seconds * 1000)) : 1;
        const level = from + (target - from) * (.5 - .5 * Math.cos(t * Math.PI));
        voice.media!.dataset.level = String(level);
        voice.media!.volume = Math.min(1, Math.max(0, level * this.busLevel(voice.bus) * .88));
        if (t === 1) clearInterval(voice.fadeTimer);
      };
      step();
      if (seconds) voice.fadeTimer = window.setInterval(step, 40);
    }
  }

  private retire(voice: Voice, seconds: number, shorten = false): void {
    if (voice.stopped && !shorten) return;
    voice.stopped = true;
    clearTimeout(voice.startTimer);
    clearTimeout(voice.timer);
    this.fade(voice, 0, seconds);
    if (voice.source && this.context) {
      try { voice.source.stop(this.context.currentTime + seconds + .025); } catch { this.cleanup(voice); }
    } else voice.timer = window.setTimeout(() => this.cleanup(voice), seconds * 1000 + 30);
  }

  private cleanup(voice: Voice): void {
    if (!this.active.has(voice)) return;
    voice.stopped = true;
    clearTimeout(voice.timer); clearTimeout(voice.startTimer); clearInterval(voice.fadeTimer);
    voice.source?.disconnect(); voice.node?.disconnect(); voice.pan?.disconnect();
    if (voice.media) { voice.media.pause(); voice.media.removeAttribute('src'); voice.media.load(); }
    this.active.delete(voice);
    this.trimCache();
  }

  private busLevel(bus: Bus): number {
    if (!this.settings || this.settings.muted) return 0;
    return (bus === 'music' ? this.settings.musicVolume : bus === 'ambience' ? this.settings.ambienceVolume : this.settings.sfxVolume) / 100;
  }

  private refreshMediaVolumes(): void {
    for (const voice of this.active) if (voice.media) voice.media.volume = Math.min(1, Math.max(0, Number(voice.media.dataset.level ?? voice.level) * this.busLevel(voice.bus) * .88));
  }

  private async effect(effect: Effect, origin: number, guard: () => boolean, event?: string): Promise<Voice | undefined> {
    try {
      const voice = await this.makeVoice(`sfx-${effect.id}.mp3`, 'sfx', effect.id, false, 0, guard, origin + (effect.at ?? 0), undefined, effect.pan ?? 0);
      if (!voice) return;
      voice.event = event;
      this.fade(voice, effect.gain ?? .65, .012);
      const effects = [...this.active].filter(v => v.bus === 'sfx' && !v.stopped);
      if (effects.length > 8) this.retire(effects[0], .035);
      return voice;
    } catch { return; }
  }

  private cancelEvents(): void {
    ++this.cueGeneration; this.pendingEvents.clear();
    const now = this.clock();
    for (const [id, start] of this.eventStarts) if (start > now) { this.seen.delete(id); this.eventStarts.delete(id); }
    for (const voice of this.active) if (voice.event && !voice.stopped) this.retire(voice, .045);
  }

  /** Warm a timed UI accent while its control is visible, before the gesture. */
  prepareUi(kind: UiSoundKind): void {
    if (!this.activated || !this.context || this.settings?.muted || !this.settings?.sfxVolume || document.hidden) return;
    void this.buffer(`sfx-${UI_EFFECTS[kind].id}.mp3`).catch(() => {});
  }

  click(kind: UiSoundKind = 'page'): void {
    if (!this.activated || this.settings?.muted || !this.settings?.sfxVolume || document.hidden || this.options.skipping) return;
    const now = performance.now();
    if (kind === 'page' && now - this.lastPageClick < 110) return;
    if (kind === 'page') this.lastPageClick = now;
    const request = ++this.uiRequest;
    void this.effect(UI_EFFECTS[kind], this.clock(), () => request === this.uiRequest && !this.settings?.muted && !!this.settings?.sfxVolume && !document.hidden && !this.options.skipping);
  }

  togglePreview(id: MusicId, forcePlay = false): void {
    this.cancelEvents();
    if (!forcePlay && this.previewId === id && !this.previewPaused) {
      this.previewOffset = this.position(id); this.previewPaused = true;
    } else {
      if (this.previewId !== id) this.previewOffset = 0;
      this.previewId = id; this.previewPaused = false;
    }
    this.publish({ preview: this.previewId, previewPaused: this.previewPaused, error: !this.context && !this.mediaSupported ? '当前浏览器暂时无法播放音频，仍可继续阅读。' : null });
    this.sync();
  }

  endPreview(): void {
    if (!this.previewId) return;
    this.previewId = null; this.previewPaused = false; this.previewOffset = 0;
    this.publish({ preview: null, previewPaused: false, error: null });
    this.sync();
  }

  position(id: MusicId): number {
    const voice = this.musicVoice;
    if (voice?.key === id) {
      if (voice.media) return voice.media.currentTime;
      return Math.max(0, this.clock() - voice.startedAt + voice.offset) % voice.seconds;
    }
    return this.previewId === id ? this.previewOffset : 0;
  }

  private visibility = (): void => {
    if (document.hidden) {
      this.cancelEvents();
      void this.context?.suspend().catch(() => {});
      for (const voice of this.active) voice.media?.pause();
      this.publish({ playing: false });
    } else if (!this.settings?.muted) {
      void this.context?.resume().catch(() => {});
      for (const voice of this.active) if (voice.media && !voice.stopped && !voice.startTimer) void voice.media.play().catch(() => {});
      this.publish({ playing: !!this.musicVoice });
      this.sync();
    }
  };

  dispose(): void {
    ++this.musicRequest; ++this.cueGeneration; ++this.uiRequest; this.ambienceRequests.clear();
    document.removeEventListener('visibilitychange', this.visibility);
    for (const voice of this.active) this.cleanup(voice);
    this.active.clear(); this.cache.clear(); this.loading.clear();
    void this.context?.close().catch(() => {});
  }
}

export const sound = new Soundscape();
