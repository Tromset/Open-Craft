/** Quiet procedural SFX via Web Audio (no downloaded files). */

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private lastFoot = 0;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.ctx.destination);
      this.noise = noiseBuffer(this.ctx, 0.4);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  resume(): void {
    this.ensure();
  }

  private burst(
    duration: number,
    filterFreq: number,
    gain: number,
    type: OscillatorType | "noise" = "noise",
    oscFreq = 180,
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;
    g.connect(this.master);

    if (type === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.connect(filter);
      filter.connect(g);
      src.start(t);
      src.stop(t + duration);
    } else {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(oscFreq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, oscFreq * 0.4), t + duration);
      osc.connect(filter);
      filter.connect(g);
      osc.start(t);
      osc.stop(t + duration);
    }
  }

  footstep(): void {
    const now = performance.now();
    if (now - this.lastFoot < 280) return;
    this.lastFoot = now;
    this.burst(0.07, 420, 0.18, "noise");
  }

  break(): void {
    this.burst(0.14, 280, 0.28, "noise");
  }

  place(): void {
    this.burst(0.08, 700, 0.16, "square", 220);
  }

  splash(): void {
    this.burst(0.22, 500, 0.22, "noise");
  }

  hurt(): void {
    this.burst(0.2, 180, 0.3, "sawtooth", 140);
  }

  ui(): void {
    this.burst(0.05, 1200, 0.1, "square", 660);
  }

  death(): void {
    this.burst(0.45, 90, 0.28, "sawtooth", 90);
  }
}
