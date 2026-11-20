import type { SoundscapeId } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeSound: SoundscapeId = 'off';
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSources: AudioScheduledSourceNode[] = [];
  private volume = 0.5;
  private continuousAlarmTimer: number | null = null;
  private continuousAlarmStartedAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private stopCurrentSoundscape(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // ignore
      }
      try {
        src.disconnect();
      } catch {
        // ignore
      }
    }
    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    this.activeNodes = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.153852;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }

      const fade = Math.min(2048, Math.floor(length / 10));
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        const tailIdx = length - fade + i;
        const blended = data[i] * t + data[tailIdx] * (1 - t);
        data[i] = blended;
        data[tailIdx] = blended;
      }
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.022 * white) / 1.022;
        data[i] = lastOut * 2.2;
      }
      const fade = Math.min(2048, Math.floor(length / 10));
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        const tailIdx = length - fade + i;
        const blended = data[i] * t + data[tailIdx] * (1 - t);
        data[i] = blended;
        data[tailIdx] = blended;
      }
    }
    return buffer;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.65, this.ctx.currentTime, 0.08);
    }
  }

  public setSoundscape(id: SoundscapeId, volume = this.volume): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (id === this.activeSound && id !== 'off') {
      this.setVolume(this.volume);
      return;
    }

    this.stopCurrentSoundscape();
    this.activeSound = id;

    if (id === 'off') return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.volume * 0.65),
      ctx.currentTime + 0.35,
    );
    master.connect(ctx.destination);
    this.masterGain = master;

    if (id === 'white') {
      const src = ctx.createBufferSource();
      src.buffer = this.createPinkNoiseBuffer(ctx, 5);
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3200;

      src.connect(lowpass);
      lowpass.connect(master);
      src.start();

      this.activeSources.push(src);
      this.activeNodes.push(lowpass);
    } else if (id === 'rain') {
      const src1 = ctx.createBufferSource();
      src1.buffer = this.createPinkNoiseBuffer(ctx, 6);
      src1.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1150;
      bandpass.Q.value = 0.55;

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.9;

      const src2 = ctx.createBufferSource();
      src2.buffer = this.createBrownNoiseBuffer(ctx, 5);
      src2.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 320;

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.45;

      src1.connect(bandpass);
      bandpass.connect(bedGain);
      bedGain.connect(master);

      src2.connect(lowpass);
      lowpass.connect(rumbleGain);
      rumbleGain.connect(master);

      src1.start();
      src2.start();

      this.activeSources.push(src1, src2);
      this.activeNodes.push(bandpass, bedGain, lowpass, rumbleGain);
    } else if (id === 'cafe') {
      const roomSrc = ctx.createBufferSource();
      roomSrc.buffer = this.createBrownNoiseBuffer(ctx, 6);
      roomSrc.loop = true;

      const roomLp = ctx.createBiquadFilter();
      roomLp.type = 'lowpass';
      roomLp.frequency.value = 420;

      const roomGain = ctx.createGain();
      roomGain.gain.value = 0.7;

      const murmurSrc = ctx.createBufferSource();
      murmurSrc.buffer = this.createPinkNoiseBuffer(ctx, 5);
      murmurSrc.loop = true;

      const murmurBp = ctx.createBiquadFilter();
      murmurBp.type = 'bandpass';
      murmurBp.frequency.value = 620;
      murmurBp.Q.value = 1.2;

      const murmurGain = ctx.createGain();
      murmurGain.gain.value = 0.28;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.22;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;

      lfo.connect(lfoGain);
      lfoGain.connect(murmurBp.frequency);

      roomSrc.connect(roomLp);
      roomLp.connect(roomGain);
      roomGain.connect(master);

      murmurSrc.connect(murmurBp);
      murmurBp.connect(murmurGain);
      murmurGain.connect(master);

      roomSrc.start();
      murmurSrc.start();
      lfo.start();

      this.activeSources.push(roomSrc, murmurSrc, lfo);
      this.activeNodes.push(roomLp, roomGain, murmurBp, murmurGain, lfoGain);
    } else if (id === 'brown') {
      const src = ctx.createBufferSource();
      src.buffer = this.createBrownNoiseBuffer(ctx, 5);
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 540;

      src.connect(lowpass);
      lowpass.connect(master);
      src.start();

      this.activeSources.push(src);
      this.activeNodes.push(lowpass);
    } else if (id === 'beach') {
      // Rhythmic ocean surf waves
      const waveSrc = ctx.createBufferSource();
      waveSrc.buffer = this.createPinkNoiseBuffer(ctx, 7);
      waveSrc.loop = true;

      const waveLp = ctx.createBiquadFilter();
      waveLp.type = 'lowpass';
      waveLp.frequency.value = 780;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.5;

      const surfLfo = ctx.createOscillator();
      surfLfo.type = 'sine';
      surfLfo.frequency.value = 0.11; // ~9s wave cycle

      const surfDepth = ctx.createGain();
      surfDepth.gain.value = 0.36;

      const freqDepth = ctx.createGain();
      freqDepth.gain.value = 460;

      surfLfo.connect(surfDepth);
      surfDepth.connect(waveGain.gain);
      surfLfo.connect(freqDepth);
      freqDepth.connect(waveLp.frequency);

      waveSrc.connect(waveLp);
      waveLp.connect(waveGain);
      waveGain.connect(master);

      waveSrc.start();
      surfLfo.start();

      this.activeSources.push(waveSrc, surfLfo);
      this.activeNodes.push(waveLp, waveGain, surfDepth, freqDepth);
    } else if (id === 'forest') {
      // Soft canopy wind breeze
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = this.createPinkNoiseBuffer(ctx, 6);
      windSrc.loop = true;

      const windBp = ctx.createBiquadFilter();
      windBp.type = 'bandpass';
      windBp.frequency.value = 480;
      windBp.Q.value = 0.7;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.55;

      const windLfo = ctx.createOscillator();
      windLfo.type = 'sine';
      windLfo.frequency.value = 0.15;

      const windLfoDepth = ctx.createGain();
      windLfoDepth.gain.value = 210;

      windLfo.connect(windLfoDepth);
      windLfoDepth.connect(windBp.frequency);

      windSrc.connect(windBp);
      windBp.connect(windGain);
      windGain.connect(master);

      windSrc.start();
      windLfo.start();

      this.activeSources.push(windSrc, windLfo);
      this.activeNodes.push(windBp, windGain, windLfoDepth);
    }
  }

  public playTimerDoneChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.14 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 1.2);
    });
  }

  public startContinuousAlarm(): void {
    this.stopContinuousAlarm();
    this.continuousAlarmStartedAt = Date.now();
    this.playTimerDoneChime();

    this.continuousAlarmTimer = window.setInterval(() => {
      if (Date.now() - this.continuousAlarmStartedAt >= 5 * 60 * 1000) {
        this.stopContinuousAlarm();
        return;
      }
      this.playTimerDoneChime();
    }, 3400);
  }

  public stopContinuousAlarm(): void {
    if (this.continuousAlarmTimer !== null) {
      window.clearInterval(this.continuousAlarmTimer);
      this.continuousAlarmTimer = null;
    }
  }

  public playIntervalChime(volumeScale1To10 = 4): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const vol = Math.max(0.02, Math.min(0.25, (volumeScale1To10 / 10) * 0.22));
    const now = ctx.currentTime;
    const freqs = [432, 648]; // gentle harmonic bell

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.04);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(vol / (idx + 1), now + idx * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 1.65);
    });
  }

  public playCompleteSound(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 880];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }
}

export const audioEngine = new AudioEngine();
