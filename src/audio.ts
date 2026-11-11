import type { Settings } from './types';

// Original, locally synthesized score: slow pentatonic strings, soft bells,
// filtered river/wind/fire textures. No third-party audio or remote requests.
class Soundscape {
  private context?: AudioContext;
  private music?: GainNode;
  private ambience?: GainNode;
  private river?: GainNode;
  private wind?: GainNode;
  private fire?: GainNode;
  private noise?: AudioBuffer;
  private timer?: number;
  private scene = 'hero';
  private tick = 0;
  private settings?: Settings;

  async unlock(settings: Settings): Promise<void> {
    this.settings = settings;
    if (!this.context) {
      const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      try { this.context = new Context(); } catch { return; }
      this.music = this.context.createGain();
      this.ambience = this.context.createGain();
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 3;
      this.music.connect(compressor); this.ambience.connect(compressor); compressor.connect(this.context.destination);
      this.noise = this.context.createBuffer(2, this.context.sampleRate * 6, this.context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const samples = this.noise.getChannelData(channel);
        let last = 0;
        for (let i = 0; i < samples.length; i++) {
          last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
          samples[i] = last * 8;
        }
      }
      this.river = this.noiseLayer(800, 0.8);
      this.wind = this.noiseLayer(220, 0.2);
      this.fire = this.noiseLayer(2100, 0.6);
      this.update(settings); this.setScene(this.scene);
      this.schedule();
      this.timer = window.setInterval(() => this.schedule(), 4400);
      document.addEventListener('visibilitychange', () => {
        if (!this.context) return;
        if (document.hidden) void this.context.suspend().catch(() => {});
        else if (!this.settings?.muted) void this.context.resume().catch(() => {});
      });
    }
    if (this.context.state === 'suspended') {
      try { await this.context.resume(); } catch { return; }
    }
    this.update(settings);
  }

  private noiseLayer(frequency: number, q: number): GainNode {
    const ctx = this.context!;
    const source = ctx.createBufferSource(); source.buffer = this.noise!; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = q;
    const gain = ctx.createGain(); gain.gain.value = 0;
    source.connect(filter); filter.connect(gain); gain.connect(this.ambience!); source.start();
    return gain;
  }

  update(settings: Settings): void {
    this.settings = settings;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.music?.gain.setTargetAtTime(settings.muted ? 0 : settings.musicVolume / 100 * 0.30, now, 0.35);
    this.ambience?.gain.setTargetAtTime(settings.muted ? 0 : settings.ambienceVolume / 100 * 0.24, now, 0.35);
  }

  setScene(scene: string): void {
    this.scene = scene;
    if (!this.context) return;
    const water = ['hero', 'river', 'marsh', 'underwater', 'light-river', 'village', 'shrine'].includes(scene);
    const fire = ['hut', 'study', 'ritual', 'snow', 'ruins', 'home'].includes(scene);
    const wind = ['mountain', 'snow', 'cave', 'bamboo'].includes(scene);
    const now = this.context.currentTime;
    this.river?.gain.setTargetAtTime(water ? 0.40 : 0.025, now, 3);
    this.fire?.gain.setTargetAtTime(fire ? 0.07 : 0, now, 3);
    this.wind?.gain.setTargetAtTime(wind ? 0.38 : 0.06, now, 3);
  }

  private note(frequency: number, start: number, length: number, amplitude: number, bell = false): void {
    const ctx = this.context!;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(amplitude, start + (bell ? 0.018 : 2.1));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.sin(this.tick * 1.4) * 0.35;
    gain.connect(pan); pan.connect(this.music!);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = frequency;
    osc.connect(gain); osc.start(start); osc.stop(start + length + 0.1);
    if (bell) {
      const overtone = ctx.createOscillator(); overtone.type = 'sine'; overtone.frequency.value = frequency * 2.001;
      const overtoneGain = ctx.createGain(); overtoneGain.gain.value = 0.13;
      overtone.connect(overtoneGain); overtoneGain.connect(gain); overtone.start(start); overtone.stop(start + length);
    }
  }

  private schedule(): void {
    if (!this.context || this.context.state === 'closed') return;
    const ctx = this.context;
    const scale = [146.832, 174.614, 195.998, 220.0, 261.626, 293.665];
    const phrase = [0, 3, 4, 2, 0, 1, 3, 5, 4, 2, 1, 0];
    const step = phrase[this.tick % phrase.length];
    const dark = ['ritual', 'tomb', 'nightmare', 'snow'].includes(this.scene);
    const root = dark ? 0.5 : 1;
    this.note(scale[step] * root, ctx.currentTime + 0.05, 8.4, 0.17);
    this.note(scale[(step + 3) % scale.length] * root, ctx.currentTime + 0.4, 7.8, 0.08);
    if (this.tick % 2 === 0) this.note(scale[(step + 1) % scale.length] * 2, ctx.currentTime + 1.5, 4.8, dark ? 0.04 : 0.08, true);
    this.tick++;
  }

  click(kind: 'page' | 'choice' | 'bell' = 'page'): void {
    if (!this.context || this.settings?.muted || this.context.state !== 'running') return;
    const ctx = this.context;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(kind === 'page' ? 0.009 : 0.032, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'bell' ? 1.5 : 0.15));
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator(); osc.frequency.value = kind === 'bell' ? 783.99 : kind === 'choice' ? 523.25 : 349.23;
    osc.connect(gain); osc.start(); osc.stop(now + (kind === 'bell' ? 1.5 : 0.15));
  }

  dispose(): void { if (this.timer) clearInterval(this.timer); void this.context?.close(); }
}

export const sound = new Soundscape();
