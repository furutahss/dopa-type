export const GAME_MS = 60_000;
export const SHARE_URL = 'https://games.furutahss.com/dopa-type/';

const SCORE_CAP = Number.MAX_SAFE_INTEGER;

function capScore(n: number): number {
  if (!Number.isFinite(n) || n >= SCORE_CAP) return SCORE_CAP;
  return Math.max(1, Math.round(n));
}

export function gainForHit(combo: number): number {
  const c = Math.max(1, combo);
  const mult = 1 + Math.min(c, 150) / 6;
  const curve = Math.pow(1.04, Math.min(c, 240));
  let gain = 40 * mult * curve;
  if (c > 240) gain *= Math.pow(1.03, c - 240);
  return capScore(gain);
}

export function gainForWord(combo: number, mora: number, elapsedMs: number): number {
  const expected = Math.max(240, mora * 420);
  const speed = Math.min(3, Math.max(1, expected / Math.max(160, elapsedMs)));
  return capScore(gainForHit(Math.max(1, combo)) * mora * 4 * speed);
}

export function addDopa(current: number, gain: number): number {
  const next = current + gain;
  if (!Number.isFinite(next) || next >= SCORE_CAP) return SCORE_CAP;
  return next;
}

export type Tier = 0 | 1 | 2 | 3 | 4;

export function tierOf(heat: number): Tier {
  if (heat >= 150) return 4;
  if (heat >= 80) return 3;
  if (heat >= 40) return 2;
  if (heat >= 15) return 1;
  return 0;
}

export const TIER_NAME = ['', 'FEVER', 'OVERDRIVE', '脳汁', 'DOPAMAX'] as const;

export function rankOf(dopa: number): { name: string; line: string } {
  if (dopa >= 1_000_000_000_000_000) return { name: 'ドパの果てがない', line: '天井はなかった。' };
  if (dopa >= 100_000_000_000_000) return { name: 'ドパオーバーフロー', line: '数が溶ける。' };
  if (dopa >= 10_000_000_000_000) return { name: 'エンドレスドパ', line: '上がるところがまだある。' };
  if (dopa >= 1_000_000_000_000) return { name: 'ドパの外側', line: '単位が追いつかない。' };
  if (dopa >= 100_000_000_000) return { name: '特異点ドパ', line: '光が指から離れない。' };
  if (dopa >= 10_000_000_000) return { name: 'ドパ銀河', line: '画面の外まで飛んでる。' };
  if (dopa >= 1_000_000_000) return { name: 'ドパ星', line: '重力がドパになった。' };
  if (dopa >= 100_000_000) return { name: '伝説のドパガキ', line: '指から光が見える。' };
  if (dopa >= 10_000_000) return { name: 'ドパの暴風', line: '画面が壊れた。きみのせい。' };
  if (dopa >= 1_000_000) return { name: '指が光ってる', line: '脳汁、止まらない。' };
  if (dopa >= 100_000) return { name: '脳汁でてきた', line: 'かなりドパドパしてる。' };
  if (dopa >= 10_000) return { name: 'ドパドパ', line: 'いい感じに出てる。' };
  if (dopa >= 1_000) return { name: 'じわっとドパ', line: 'まだいける。' };
  return { name: '指がねむい', line: 'キーボードを起こそう。' };
}

export type Result = {
  dopa: number;
  maxCombo: number;
  hits: number;
  misses: number;
  words: number;
  kana: number;
  elapsedMs: number;
};

export function accuracyOf(r: Pick<Result, 'hits' | 'misses'>): number {
  const total = r.hits + r.misses;
  if (total <= 0) return 0;
  return Math.round((r.hits / total) * 1000) / 10;
}

export function kpmOf(r: Pick<Result, 'hits' | 'elapsedMs'>): number {
  const min = Math.max(1, r.elapsedMs) / 60_000;
  return Math.round(r.hits / min);
}
