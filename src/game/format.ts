const UNITS = ['', '万', '億', '兆', '京'];

export function formatDopa(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v < 10_000) return v.toLocaleString('ja-JP');
  let scaled = v;
  let unit = 0;
  while (scaled >= 10_000 && unit < UNITS.length - 1) {
    scaled /= 10_000;
    unit += 1;
  }
  if (scaled >= 9_999.5 && unit < UNITS.length - 1) {
    scaled /= 10_000;
    unit += 1;
  }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const text = scaled
    .toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
  return text + UNITS[unit];
}

export function formatDopaFull(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('ja-JP');
}
