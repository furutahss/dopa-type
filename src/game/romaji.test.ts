import assert from 'node:assert/strict';
import { formatDopa } from './format.ts';
import { applyInput, preferredReading } from './romaji.ts';
import { gainForHit, gainForWord, rankOf } from './scoring.ts';
import { WORDS } from './words.ts';

function mustClear(kana: string, typed: string) {
  let state = '';
  let cleared = false;
  for (const ch of typed) {
    const next = applyInput(kana, state, ch);
    assert.equal(next.ok, true, `${kana} "${typed}" stuck after "${state}" + ${ch}`);
    state = next.typed;
    cleared = next.cleared;
  }
  assert.equal(cleared, true, `${kana} did not clear on "${typed}"`);
}

for (const word of WORDS) {
  const reading = preferredReading(word.kana);
  assert.ok(reading.length > 0, word.kana);
  mustClear(word.kana, reading);
}

mustClear('ねこ', 'neko');
mustClear('すし', 'sushi');
mustClear('すし', 'susi');
mustClear('がっこう', 'gakkou');
mustClear('がっこう', 'gaxtsukou');
mustClear('がっこう', 'galtsukou');
mustClear('まっちゃ', 'maccha');
mustClear('まっちゃ', 'mattya');
mustClear('ねっちゅう', 'necchuu');
mustClear('ねっちゅう', 'nettyuu');
mustClear('らーめん', 'ra-menn');
mustClear('らーめん', 'raamenn');
mustClear('ぱん', 'pann');
mustClear('ぱん', "pan'");
mustClear('ぱん', 'paxn');
mustClear('ぱな', 'pana');
mustClear('こんにちわ', 'konnichiwa');
mustClear('こんにちわ', 'konnitiwa');
mustClear('こんにゃく', 'konnyaku');
mustClear('んあ', 'nna');
mustClear('んあ', "n'a");
mustClear('じゃじゃん', 'jajann');
mustClear('じゃじゃん', 'zyazyann');
mustClear('ふぃーばー', 'fi-ba-');
mustClear('ふぃーばー', 'fiibaa');
mustClear('を', 'wo');
mustClear('を', 'o');

assert.equal(applyInput('ねこ', '', 'x').ok, false);
assert.equal(applyInput('ねこ', 'ne', 'x').typed, 'ne');
assert.equal(applyInput('んあ', 'n', 'a').ok, false);
assert.equal(applyInput('ぱん', 'pa', 'n').ok, true);
assert.equal(applyInput('ぱん', 'pa', 'n').cleared, false);
assert.equal(applyInput('ぱん', 'pan', 'n').cleared, true);
assert.equal(applyInput('らーめん', 'ra-men', 'n').cleared, true);
assert.equal(preferredReading('ぱん'), 'pann');
assert.equal(preferredReading('おんせん'), 'onsenn');
assert.equal(preferredReading('こんにちわ'), 'konnichiwa');
assert.equal(applyInput('なに', '', 'n').ok, true);
assert.equal(applyInput('なに', 'n', 'a').ok, true);
assert.equal(applyInput('ぱな', '', 'p').ok, true);
assert.equal(applyInput('ぱな', 'pan', 'a').cleared, true);

assert.equal(formatDopa(999), '999');
assert.equal(formatDopa(12345), '1.23万');
assert.equal(formatDopa(10000), '1万');
assert.equal(formatDopa(100000000), '1億');
assert.equal(formatDopa(150000000), '1.5億');
assert.equal(formatDopa(1_000_000_000), '10億');
assert.equal(formatDopa(1_000_000_000_000), '1兆');
assert.equal(formatDopa(1_000_000_000_000_000), '1000兆');
assert.ok(gainForHit(241) > gainForHit(240));
assert.ok(gainForHit(360) > gainForHit(240) * 10);
assert.ok(gainForHit(480) > gainForHit(360) * 10);
assert.equal(rankOf(100_000_000).name, '伝説のドパガキ');
assert.equal(rankOf(1_000_000_000).name, 'ドパ星');
assert.equal(rankOf(10_000_000_000).name, 'ドパ銀河');
assert.equal(rankOf(100_000_000_000).name, '特異点ドパ');
assert.equal(rankOf(1_000_000_000_000).name, 'ドパの外側');
assert.equal(rankOf(10_000_000_000_000).name, 'エンドレスドパ');
assert.equal(rankOf(100_000_000_000_000).name, 'ドパオーバーフロー');
assert.equal(rankOf(1_000_000_000_000_000).name, 'ドパの果てがない');

function sim(keysPerSec: number, missEvery: number) {
  let combo = 0;
  let dopa = 0;
  let mora = 0;
  const keys = Math.round(keysPerSec * 60);
  for (let i = 1; i <= keys; i += 1) {
    if (missEvery > 0 && i % missEvery === 0) {
      combo = 0;
      continue;
    }
    combo += 1;
    dopa += gainForHit(combo);
    mora += 1;
    if (mora === 3) {
      dopa += gainForWord(combo, 3, (3 / keysPerSec) * 1000);
      mora = 0;
    }
  }
  return { keys, dopa, combo };
}

console.log('slow', sim(2, 6));
console.log('mid', sim(4, 25));
console.log('good', sim(6, 80));
console.log('god', sim(8, 0));
console.log('words', WORDS.length);
