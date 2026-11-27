// Sound, synthesised live with WebAudio — no audio files. A gobble when the
// run starts and when corn is eaten, a wing-flap rustle on every jump, a
// two-note chime for corn, a low thud for a hit, the farmer's shout when he
// closes in, and a little fanfare for reaching the forest. Everything starts
// on the first user gesture (browsers require it) and M toggles mute.

export function createAudio() {
  let ctx = null;
  let windGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return;
    started = true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
      // Wind: looped filtered noise, louder the faster the turkey runs.
      const length = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const windSource = ctx.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 600;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSource.start();
    } catch {
      ctx = null;
    }
  }

  /** Wind follows the running speed, every frame. */
  function update(speed, running) {
    if (!ctx || muted) {
      if (windGain) windGain.gain.value = 0;
      return;
    }
    windGain.gain.setTargetAtTime(running ? Math.min(0.1, speed * 0.006) : 0.015, ctx.currentTime, 0.2);
  }

  function tone(freq, at, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(vol || 0.22, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  function noiseBurst(at, dur, vol, freq) {
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq || 900;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.25;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(at);
  }

  /** A gobble: four quick descending clucks — the turkey's war cry. */
  function gobble() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [420, 380, 340, 300].forEach((f, i) => tone(f, t + i * 0.09, 0.09, 'square', 0.16, f * 0.8));
  }

  /** A wing-flap rustle when the turkey jumps. */
  function flap() {
    if (!ctx) return;
    noiseBurst(ctx.currentTime, 0.18, 0.22, 1100);
  }

  /** Two-note chime when corn is eaten. */
  function cornChime() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(880, t, 0.22, 'sine', 0.2);
    tone(1318, t + 0.08, 0.3, 'sine', 0.18);
  }

  /** A low thud for a hit, and a sharper crack for the knife. */
  function hit(knife) {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(knife ? 180 : 90, t, 0.35, 'sawtooth', 0.3, 50);
    tone(70, t, 0.3, 'sine', 0.4);
    if (knife) noiseBurst(t, 0.12, 0.3, 3200);
  }

  /** The farmer's shout when he closes in: a gruff descending yell. */
  function shout() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(160, t, 0.3, 'sawtooth', 0.22, 110);
    tone(140, t + 0.12, 0.25, 'sawtooth', 0.18, 100);
  }

  /** A sad descending buzz for being caught. */
  function caught() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(220, t, 0.6, 'sawtooth', 0.22, 110);
    tone(110, t + 0.1, 0.8, 'sawtooth', 0.2, 55);
  }

  /** A little fanfare arpeggio for reaching the forest. */
  function escaped() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.13, 0.35, 'triangle', 0.24));
  }

  /** Short click for menu buttons. */
  function click() {
    if (!ctx) return;
    tone(660, ctx.currentTime, 0.08, 'square', 0.08);
  }

  return {
    ensure,
    update,
    gobble,
    flap,
    cornChime,
    hit,
    shout,
    caught,
    escaped,
    click,
    toggleMute() {
      muted = !muted;
      if (muted && windGain) windGain.gain.value = 0;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
