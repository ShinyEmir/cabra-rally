// Sound effects generated with Web Audio; no audio files. The audio context starts on the
// player's first touch or key press (browsers block sound before that), and the mute choice is
// saved on the device.

const SFX = {
  storageKey: 'cabra-rally-muted',
  master: 0.6,
  engine: { base: 55, perSpeed: 7, perThrottle: 18, volume: 0.05, filter: 700, smooth: 0.06 },
} as const;

type Wave = OscillatorType;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted: boolean;

  constructor() {
    let saved = false;
    try { saved = localStorage.getItem(SFX.storageKey) === '1'; } catch { /* storage may be unavailable */ }
    this.muted = saved;
  }

  /** Call from a user gesture. Creates or resumes the audio context. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : SFX.master;
        this.master.connect(ctx.destination);
        // engine: a filtered sawtooth that idles silent until driving
        const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = SFX.engine.base;
        filter.type = 'lowpass'; filter.frequency.value = SFX.engine.filter;
        gain.gain.value = 0;
        osc.connect(filter); filter.connect(gain); gain.connect(this.master);
        osc.start();
        this.engineOsc = osc; this.engineGain = gain;
        const len = Math.floor(ctx.sampleRate * 0.5);
        this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { /* audio is optional */ }
  }

  /** Pauses all sound, for example when the page is hidden. */
  sleep(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try { localStorage.setItem(SFX.storageKey, muted ? '1' : '0'); } catch { /* storage may be unavailable */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : SFX.master, this.ctx.currentTime, 0.02);
  }

  /** Engine hum: pitch follows speed and throttle; silent when not driving. */
  engine(speed: number, throttle: number, driving: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const t = this.ctx.currentTime, e = SFX.engine;
    this.engineOsc.frequency.setTargetAtTime(e.base + speed * e.perSpeed + Math.max(0, throttle) * e.perThrottle, t, e.smooth);
    this.engineGain.gain.setTargetAtTime(driving ? e.volume * (0.6 + 0.4 * Math.max(0, throttle)) : 0, t, e.smooth);
  }

  private tone(freq: number, dur: number, wave: Wave, volume: number, delay = 0, slideTo?: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, volume: number, cutoff: number, delay = 0): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    src.buffer = this.noiseBuffer;
    filter.type = 'lowpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  coin(): void {
    this.tone(1320, 0.08, 'square', 0.06);
    this.tone(1760, 0.12, 'square', 0.05, 0.06);
  }

  friend(): void {
    this.tone(660, 0.12, 'triangle', 0.12);
    this.tone(990, 0.16, 'triangle', 0.12, 0.1);
  }

  /** Rising notes, one more for each flip in the same jump. */
  flip(count: number): void {
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < Math.min(notes.length, count + 1); i++) this.tone(notes[i], 0.12, 'triangle', 0.1, i * 0.07);
  }

  airtime(): void {
    this.tone(880, 0.07, 'sine', 0.06);
  }

  cleanLanding(): void {
    this.tone(784, 0.1, 'triangle', 0.09);
    this.tone(1175, 0.18, 'triangle', 0.09, 0.08);
  }

  wheelie(): void {
    this.tone(440, 0.06, 'square', 0.04);
  }

  /** Thump when the wheels hit the ground; louder for harder landings (0 to 1). */
  land(strength: number): void {
    const v = Math.min(1, Math.max(0, strength));
    if (v < 0.05) return;
    this.tone(110, 0.15, 'sine', 0.15 * v, 0, 55);
    this.noise(0.08, 0.08 * v, 500);
  }

  crash(): void {
    this.noise(0.45, 0.25, 1200);
    this.tone(220, 0.4, 'sawtooth', 0.08, 0, 70);
  }

  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 3 ? 0.4 : 0.14, 'triangle', 0.12, i * 0.12));
  }
}
