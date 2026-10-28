import { useEffect, useRef, useState } from 'react';
import {
  playClear,
  playFinish,
  playHit,
  playMiss,
  playTierUp,
  setAudioTier,
  startBed,
  stopBed,
} from './audio';
import { formatDopa } from './format';
import { applyInput, guidesFor, moraCount, type Guide } from './romaji';
import { GAME_MS, addDopa, gainForHit, gainForWord, tierOf, type Result, type Tier } from './scoring';
import { pickWord, type Word } from './words';
import { burstAt } from '../fx';

export type FloatText = { id: number; text: string; born: number; big: boolean };

export type PlayView = {
  word: Word;
  next: Word;
  guides: Guide[];
  dopa: number;
  combo: number;
  tier: Tier;
  left: number;
  floats: FloatText[];
  missSeq: number;
  pop: number;
  go: boolean;
  ime: boolean;
  shake: { x: number; y: number };
  punch: number;
  boom: number;
};

type Run = {
  word: Word;
  next: Word;
  typed: string;
  combo: number;
  maxCombo: number;
  heat: number;
  dopa: number;
  hits: number;
  misses: number;
  words: number;
  kana: number;
  startedAt: number;
  wordAt: number;
  floats: FloatText[];
  floatId: number;
  missSeq: number;
  pop: number;
  ime: boolean;
  shakeX: number;
  shakeY: number;
  shakeUntil: number;
  punch: number;
  boom: number;
  finished: boolean;
};

function makeRun(now: number): Run {
  const word = pickWord('');
  return {
    word,
    next: pickWord(word.kana),
    typed: '',
    combo: 0,
    maxCombo: 0,
    heat: 0,
    dopa: 0,
    hits: 0,
    misses: 0,
    words: 0,
    kana: 0,
    startedAt: now,
    wordAt: now,
    floats: [],
    floatId: 1,
    missSeq: 0,
    pop: 0,
    ime: false,
    shakeX: 0,
    shakeY: 0,
    shakeUntil: 0,
    punch: 0,
    boom: 0,
    finished: false,
  };
}

function snapshot(run: Run, now: number): PlayView {
  const left = Math.max(0, GAME_MS - (now - run.startedAt));
  const shaking = now < run.shakeUntil;
  return {
    word: run.word,
    next: run.next,
    guides: guidesFor(run.word.kana, run.typed),
    dopa: run.dopa,
    combo: run.combo,
    tier: tierOf(run.heat),
    left,
    floats: run.floats.filter((f) => now - f.born < (f.big ? 980 : 760)),
    missSeq: run.missSeq,
    pop: run.pop,
    go: now - run.startedAt < 320,
    ime: run.ime,
    shake: shaking ? { x: run.shakeX, y: run.shakeY } : { x: 0, y: 0 },
    punch: run.punch,
    boom: run.boom,
  };
}

function pointOf(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight * 0.46 };
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function usePlay(onFinish: (result: Result) => void) {
  const runRef = useRef<Run | null>(null);
  if (!runRef.current) runRef.current = makeRun(performance.now());
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const [view, setView] = useState<PlayView>(() => snapshot(runRef.current!, performance.now()));

  useEffect(() => {
    const run = runRef.current!;
    const origin = performance.now();
    run.startedAt = origin;
    run.wordAt = origin;
    startBed();
    let raf = 0;
    let last = origin;

    const finish = (now = performance.now()) => {
      if (run.finished) return;
      run.finished = true;
      stopBed();
      playFinish();
      finishRef.current({
        dopa: Math.floor(run.dopa),
        maxCombo: run.maxCombo,
        hits: run.hits,
        misses: run.misses,
        words: run.words,
        kana: run.kana,
        elapsedMs: Math.min(GAME_MS, Math.max(1, now - run.startedAt)),
      });
    };

    const paint = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      if (run.heat > run.combo) run.heat = Math.max(run.combo, run.heat - dt * 0.018);
      setAudioTier(tierOf(run.heat));
      if (now - run.startedAt >= GAME_MS) {
        setView(snapshot(run, run.startedAt + GAME_MS));
        finish(run.startedAt + GAME_MS);
        return;
      }
      setView(snapshot(run, now));
      raf = requestAnimationFrame(paint);
    };

    const onKey = (event: KeyboardEvent) => {
      if (run.finished) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        return;
      }
      if (event.key.length !== 1 || !/^[a-zA-Z'\-]$/.test(event.key)) {
        if (/[^\u0000-\u007f]/.test(event.key)) run.ime = true;
        return;
      }
      event.preventDefault();
      const now = performance.now();
      if (now - run.startedAt >= GAME_MS) {
        finish(now);
        return;
      }

      const applied = applyInput(run.word.kana, run.typed, event.key);
      const at = pointOf('.group.current');
      if (!applied.ok) {
        run.missSeq += 1;
        run.combo = 0;
        run.misses += 1;
        run.heat *= 0.62;
        run.ime = false;
        run.shakeX = (Math.random() * 2 - 1) * 8;
        run.shakeY = (Math.random() * 2 - 1) * 5;
        run.shakeUntil = now + 90;
        playMiss();
        burstAt(at.x, at.y, tierOf(run.heat), 0.45, true);
        setView(snapshot(run, now));
        return;
      }

      const prevTier = tierOf(run.combo);
      run.combo += 1;
      run.maxCombo = Math.max(run.maxCombo, run.combo);
      run.hits += 1;
      run.typed = applied.typed;
      run.ime = false;
      run.heat = Math.max(run.heat, run.combo);
      let gain = gainForHit(run.combo);
      const tier = tierOf(run.heat);
      const tierUp = tierOf(run.combo) > prevTier;
      if (applied.cleared) {
        const mora = moraCount(run.word.kana);
        gain += gainForWord(run.combo, mora, now - run.wordAt);
        run.words += 1;
        run.kana += run.word.kana.length;
        run.word = run.next;
        run.next = pickWord(run.word.kana);
        run.typed = '';
        run.wordAt = now;
        run.pop += 1;
        playClear(tier);
        burstAt(at.x, at.y, tier, 2.3);
        burstAt(window.innerWidth * 0.1, window.innerHeight * 0.82, tier, 1.5);
        burstAt(window.innerWidth * 0.9, window.innerHeight * 0.82, tier, 1.5);
      } else {
        playHit(tier);
        burstAt(at.x, at.y, tier, 0.85 + tier * 0.16);
      }
      if (tierUp) {
        playTierUp();
        burstAt(window.innerWidth / 2, window.innerHeight * 0.34, tierOf(run.combo), 3);
        burstAt(window.innerWidth * 0.5, 92, tierOf(run.combo), 2.1);
      }
      run.punch += 1;
      run.boom = tierUp ? 3 : applied.cleared ? 2 : 1;
      run.dopa = addDopa(run.dopa, gain);
      const big = applied.cleared || tierUp;
      run.floats.push({ id: run.floatId, text: `+${formatDopa(gain)}`, born: now, big });
      run.floatId += 1;
      if (run.floats.length > 5) run.floats.shift();
      const amp = tierUp ? 12 : applied.cleared ? 9 : 3;
      run.shakeX = (Math.random() * 2 - 1) * amp;
      run.shakeY = (Math.random() * 2 - 1) * amp * 0.6;
      run.shakeUntil = now + (applied.cleared ? 110 : 60);
      setAudioTier(tier);
      setView(snapshot(run, now));
    };

    const onCompose = () => {
      run.ime = true;
      setView(snapshot(run, performance.now()));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('compositionstart', onCompose);
    raf = requestAnimationFrame(paint);
    const watchdog = window.setInterval(() => {
      if (performance.now() - run.startedAt >= GAME_MS) finish();
    }, 200);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(watchdog);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('compositionstart', onCompose);
      stopBed();
    };
  }, []);

  return view;
}
