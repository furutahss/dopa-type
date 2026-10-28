import type { Result } from './scoring';
import { accuracyOf, kpmOf } from './scoring';

export type Best = {
  dopa: number;
  maxCombo: number;
  kpm: number;
  accuracy: number;
  at: number;
};

const BEST_KEY = 'dopa-type:best';
const MUTE_KEY = 'dopa-type:mute';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function loadBest(): Best | null {
  const raw = read(BEST_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Best;
    if (typeof data.dopa !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveBest(result: Result): { best: Best; isNew: boolean } {
  const prev = loadBest();
  const isNew = !prev || result.dopa > prev.dopa;
  if (!isNew && prev) return { best: prev, isNew: false };
  const best: Best = {
    dopa: result.dopa,
    maxCombo: result.maxCombo,
    kpm: kpmOf(result),
    accuracy: accuracyOf(result),
    at: Date.now(),
  };
  write(BEST_KEY, JSON.stringify(best));
  return { best, isNew: true };
}

export function loadMute(): boolean {
  return read(MUTE_KEY) === '1';
}

export function saveMute(muted: boolean) {
  write(MUTE_KEY, muted ? '1' : '0');
}
