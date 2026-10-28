// かな1文字（と拗音）を、ヘボン式・訓令式のゆれごと受け入れる。
// 「ん」の n は、次が母音・や行・ん、または語末のとき nn / xn / n' を要求する。
// 語末の n 一文字は未確定のまま。エディタと同じく、もう一度 n で確定する。ぱん = pann。
// それ以外（なにぬねの を含む）は n 一文字で確定してよい。こんにちは = konnichiwa。

export type Guide = {
  kana: string;
  status: 'done' | 'current' | 'todo';
  romaji: string;
  typed: number;
};

type Choice = { romaji: string; consume: number };
type Seg = { kana: string; romaji: string; vowel: string | null };
type Partial = { kana: string; romaji: string; got: string };
type Parse = { segs: Seg[]; partial: Partial | null; index: number };

const SINGLE: Record<string, readonly string[]> = {
  あ: ['a'], い: ['i'], う: ['u'], え: ['e'], お: ['o'],
  か: ['ka'], き: ['ki'], く: ['ku'], け: ['ke'], こ: ['ko'],
  さ: ['sa'], し: ['shi', 'si'], す: ['su'], せ: ['se'], そ: ['so'],
  た: ['ta'], ち: ['chi', 'ti'], つ: ['tsu', 'tu'], て: ['te'], と: ['to'],
  な: ['na'], に: ['ni'], ぬ: ['nu'], ね: ['ne'], の: ['no'],
  は: ['ha'], ひ: ['hi'], ふ: ['fu', 'hu'], へ: ['he'], ほ: ['ho'],
  ま: ['ma'], み: ['mi'], む: ['mu'], め: ['me'], も: ['mo'],
  や: ['ya'], ゆ: ['yu'], よ: ['yo'],
  ら: ['ra'], り: ['ri'], る: ['ru'], れ: ['re'], ろ: ['ro'],
  わ: ['wa'], を: ['wo', 'o'],
  が: ['ga'], ぎ: ['gi'], ぐ: ['gu'], げ: ['ge'], ご: ['go'],
  ざ: ['za'], じ: ['ji', 'zi'], ず: ['zu'], ぜ: ['ze'], ぞ: ['zo'],
  だ: ['da'], ぢ: ['di'], づ: ['du', 'dzu'], で: ['de'], ど: ['do'],
  ば: ['ba'], び: ['bi'], ぶ: ['bu'], べ: ['be'], ぼ: ['bo'],
  ぱ: ['pa'], ぴ: ['pi'], ぷ: ['pu'], ぺ: ['pe'], ぽ: ['po'],
};

const YOUON: Record<string, readonly string[]> = {
  きゃ: ['kya'], きゅ: ['kyu'], きょ: ['kyo'],
  ぎゃ: ['gya'], ぎゅ: ['gyu'], ぎょ: ['gyo'],
  しゃ: ['sha', 'sya'], しゅ: ['shu', 'syu'], しょ: ['sho', 'syo'],
  じゃ: ['ja', 'jya', 'zya'], じゅ: ['ju', 'jyu', 'zyu'], じょ: ['jo', 'jyo', 'zyo'],
  ちゃ: ['cha', 'tya'], ちゅ: ['chu', 'tyu'], ちょ: ['cho', 'tyo'],
  にゃ: ['nya'], にゅ: ['nyu'], にょ: ['nyo'],
  ひゃ: ['hya'], ひゅ: ['hyu'], ひょ: ['hyo'],
  びゃ: ['bya'], びゅ: ['byu'], びょ: ['byo'],
  ぴゃ: ['pya'], ぴゅ: ['pyu'], ぴょ: ['pyo'],
  みゃ: ['mya'], みゅ: ['myu'], みょ: ['myo'],
  りゃ: ['rya'], りゅ: ['ryu'], りょ: ['ryo'],
  しぇ: ['she', 'sye'], じぇ: ['je', 'jye', 'zye'], ちぇ: ['che', 'tye'],
  ふぁ: ['fa'], ふぃ: ['fi'], ふぇ: ['fe'], ふぉ: ['fo'],
  てぃ: ['thi'], でぃ: ['dhi'], うぃ: ['wi'],
};

export function normalizeKana(input: string): string {
  return input.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function lastVowel(romaji: string): string | null {
  const c = romaji[romaji.length - 1] ?? '';
  return 'aiueo'.includes(c) ? c : null;
}

function basicMora(kana: string, prevVowel: string | null): Choice[] {
  if (!kana) return [];
  if (kana[0] === 'ん') {
    const opts: Choice[] = [
      { romaji: 'nn', consume: 1 },
      { romaji: 'xn', consume: 1 },
      { romaji: "n'", consume: 1 },
    ];
    if (!blocksSingleN(kana.slice(1))) opts.unshift({ romaji: 'n', consume: 1 });
    return opts;
  }
  if (kana[0] === 'ー') {
    const opts: Choice[] = [{ romaji: '-', consume: 1 }];
    if (prevVowel) opts.push({ romaji: prevVowel, consume: 1 });
    return opts;
  }
  if (kana.length >= 2) {
    const pair = YOUON[kana.slice(0, 2)];
    if (pair) return pair.map((romaji) => ({ romaji, consume: 2 }));
  }
  const one = SINGLE[kana[0]];
  if (one) return one.map((romaji) => ({ romaji, consume: 1 }));
  return [];
}

function blocksSingleN(next: string): boolean {
  if (!next) return true;
  if (next[0] === 'ん') return true;
  const morae = firstMora(next, null);
  return morae.length > 0 && morae.every((m) => /^[aiueoy]/.test(m.romaji));
}

export function firstMora(kana: string, prevVowel: string | null): Choice[] {
  if (!kana) return [];
  if (kana[0] !== 'っ') return basicMora(kana, prevVowel);

  const plain: Choice[] = ['xtu', 'xtsu', 'ltu', 'ltsu'].map((romaji) => ({ romaji, consume: 1 }));
  const doubled: Choice[] = [];
  if (kana.length > 1) {
    for (const n of basicMora(kana.slice(1), null)) {
      const ch = n.romaji[0] ?? '';
      if (/[bcdfghjklmpqrstvwxyz]/.test(ch) && ch !== 'n' && ch !== 'x' && ch !== 'l') {
        doubled.push({ romaji: ch + n.romaji, consume: 1 + n.consume });
      }
    }
  }
  return [...doubled, ...plain];
}

function parse(kana: string, typed: string): Parse | null {
  if (!typed) return { segs: [], partial: null, index: 0 };

  let best: Parse | null = null;
  let bestScore = -1;
  const consider = (p: Parse) => {
    const score = p.index * 1000 + (p.partial?.got.length ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  };

  const rec = (ki: number, ti: number, prevVowel: string | null, segs: Seg[]) => {
    if (ti === typed.length) {
      consider({ segs: segs.slice(), partial: null, index: ki });
      return;
    }
    if (ki >= kana.length) return;
    const opts = firstMora(kana.slice(ki), prevVowel);
    for (const opt of opts) {
      if (typed.startsWith(opt.romaji, ti)) {
        const vowel = lastVowel(opt.romaji);
        segs.push({
          kana: kana.slice(ki, ki + opt.consume),
          romaji: opt.romaji,
          vowel,
        });
        rec(ki + opt.consume, ti + opt.romaji.length, vowel ?? prevVowel, segs);
        segs.pop();
      }
    }
    const rest = typed.slice(ti);
    for (const opt of opts) {
      if (rest.length > 0 && rest.length < opt.romaji.length && opt.romaji.startsWith(rest)) {
        consider({
          segs: segs.slice(),
          partial: {
            kana: kana.slice(ki, ki + opt.consume),
            romaji: opt.romaji,
            got: rest,
          },
          index: ki,
        });
      }
    }
  };

  rec(0, 0, null, []);
  return best;
}

export function guidesFor(kanaRaw: string, typed: string): Guide[] {
  const kana = normalizeKana(kanaRaw);
  const parsed = parse(kana, typed);
  if (!parsed) return guidesFor(kana, '');

  const guides: Guide[] = [];
  for (const seg of parsed.segs) {
    guides.push({ kana: seg.kana, status: 'done', romaji: seg.romaji, typed: seg.romaji.length });
  }

  let ki = parsed.segs.reduce((n, s) => n + s.kana.length, 0);
  let prev = parsed.segs.length ? parsed.segs[parsed.segs.length - 1].vowel : null;

  if (parsed.partial) {
    guides.push({
      kana: parsed.partial.kana,
      status: 'current',
      romaji: parsed.partial.romaji,
      typed: parsed.partial.got.length,
    });
    ki += parsed.partial.kana.length;
    prev = lastVowel(parsed.partial.romaji) ?? prev;
  }

  let firstRest = !parsed.partial;
  while (ki < kana.length) {
    const opt = firstMora(kana.slice(ki), prev)[0];
    if (!opt || opt.consume < 1) break;
    const piece = kana.slice(ki, ki + opt.consume);
    guides.push({
      kana: piece,
      status: firstRest ? 'current' : 'todo',
      romaji: opt.romaji,
      typed: 0,
    });
    firstRest = false;
    prev = lastVowel(opt.romaji) ?? prev;
    ki += opt.consume;
  }
  return guides;
}

export function preferredReading(kanaRaw: string): string {
  return guidesFor(kanaRaw, '')
    .map((g) => g.romaji)
    .join('');
}

export function moraCount(kanaRaw: string): number {
  return guidesFor(kanaRaw, '').length;
}

export type ApplyResult = { ok: boolean; typed: string; cleared: boolean };

export function applyInput(kanaRaw: string, typed: string, key: string): ApplyResult {
  const ch = key.toLowerCase();
  if (!/^[a-z'\-]$/.test(ch)) return { ok: false, typed, cleared: false };
  const kana = normalizeKana(kanaRaw);
  const next = typed + ch;
  const parsed = parse(kana, next);
  if (!parsed) return { ok: false, typed, cleared: false };
  const cleared = parsed.partial === null && parsed.index === kana.length;
  return { ok: true, typed: next, cleared };
}
