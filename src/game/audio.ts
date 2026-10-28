// 音声ファイルは使わない。打鍵が進むほど旋律とビートが盛れる。

const PHRASE = [
  440, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33,
  523.25, 440, 392,
];

const BASS = [110, 130.81, 98, 87.31];

export const live = { tier: 0 };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let melody = 0;
let timer = 0;
let nextBeat = 0;
let beat = 0;
let running = false;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.78;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 16;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.14;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
  }
  return ctx;
}

export function unlockAudio() {
  const audio = context();
  if (audio && audio.state === 'suspended') void audio.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master) master.gain.value = next ? 0 : 0.78;
}

function envGain(at: number, peak: number, dur: number, attack = 0.008): GainNode | null {
  const audio = context();
  if (!audio || !master) return null;
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  g.connect(master);
  return g;
}

function tone(freq: number, at: number, dur: number, type: OscillatorType, peak: number, slideTo?: number) {
  const audio = context();
  const g = envGain(at, peak, dur);
  if (!audio || !g) return;
  const o = audio.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), at + dur);
  o.connect(g);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function noise(at: number, dur: number, peak: number, hp = 800) {
  const audio = context();
  const g = envGain(at, peak, dur, 0.004);
  if (!audio || !g || !noiseBuf) return;
  const src = audio.createBufferSource();
  src.buffer = noiseBuf;
  const filter = audio.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;
  src.connect(filter);
  filter.connect(g);
  src.start(at);
  src.stop(at + dur + 0.02);
}

export function setAudioTier(tier: number) {
  live.tier = Math.max(0, Math.min(4, tier));
}

export function playHit(tier: number) {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const f = PHRASE[melody % PHRASE.length];
  melody += 1;
  const body = 0.09 + Math.min(tier, 4) * 0.012;
  tone(f, now, 0.12, 'triangle', body);
  tone(f, now, 0.12, 'sine', body * 0.45);
  if (tier >= 1) tone(PHRASE[(melody + 2) % PHRASE.length], now, 0.1, 'sine', 0.035);
  if (tier >= 3) tone(f * 2, now, 0.08, 'triangle', 0.03);
  noise(now, 0.03, 0.025 + tier * 0.004, 1800);
}

export function playMiss() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  tone(96, now, 0.12, 'sine', 0.06, 70);
  noise(now, 0.08, 0.03, 200);
}

export function playClear(tier: number) {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const chord = [523.25, 659.25, 783.99, 1046.5];
  chord.forEach((f, i) => {
    tone(f, now + i * 0.012, 0.22, 'triangle', 0.06 + tier * 0.008);
  });
  noise(now, 0.1, 0.04, 1200);
}

export function playTierUp() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const o = audio.createOscillator();
  const g = envGain(now, 0.07, 0.38, 0.02);
  if (!g) return;
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, now);
  o.frequency.exponentialRampToValueAtTime(880, now + 0.36);
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(2400, now + 0.36);
  o.connect(filter);
  filter.connect(g);
  o.start(now);
  o.stop(now + 0.4);
}

export function playFinish() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(f, now + i * 0.05, 0.4, 'triangle', 0.07));
}

function kick(at: number) {
  tone(150, at, 0.14, 'sine', 0.2, 48);
}

function hat(at: number) {
  noise(at, 0.04, 0.025, 4000);
}

function clap(at: number) {
  noise(at, 0.09, 0.04, 900);
}

function bass(at: number, note: number) {
  tone(note, at, 0.18, 'sine', 0.06);
  tone(note / 2, at, 0.18, 'triangle', 0.03);
}

function schedule() {
  const audio = context();
  if (!audio || !running) return;
  const bpm = [104, 118, 132, 148, 168][live.tier] ?? 104;
  const spb = 60 / bpm;
  if (nextBeat < audio.currentTime - 0.02) nextBeat = audio.currentTime + 0.02;
  const horizon = audio.currentTime + 0.14;
  while (nextBeat < horizon) {
    const t = nextBeat;
    if (beat % 2 === 0) kick(t);
    if (live.tier >= 1 && beat % 2 === 1) clap(t);
    hat(t);
    hat(t + spb * 0.5);
    if (beat % 2 === 0) bass(t, BASS[(beat >> 1) % BASS.length]);
    beat = (beat + 1) % 8;
    nextBeat += spb;
  }
}

export function startBed() {
  const audio = context();
  if (!audio) return;
  stopBed();
  running = true;
  beat = 0;
  nextBeat = audio.currentTime + 0.06;
  timer = window.setInterval(schedule, 25);
  schedule();
}

export function stopBed() {
  running = false;
  if (timer) window.clearInterval(timer);
  timer = 0;
}
