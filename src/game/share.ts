import { formatDopa } from './format';
import { SHARE_URL, accuracyOf, kpmOf, rankOf, type Result } from './scoring';

export function shareText(result: Result): string {
  const rank = rankOf(result.dopa);
  return [
    'ドパドパタイピング 60秒',
    `${formatDopa(result.dopa)}ドパ出た`,
    `最大コンボ ${result.maxCombo} / 精度 ${accuracyOf(result)}% / ${kpmOf(result)}打/分`,
    `ランク「${rank.name}」`,
    '#ドパドパタイピング',
  ].join('\n');
}

export function openXShare(result: Result) {
  const url = new URL('https://x.com/intent/post');
  url.searchParams.set('text', shareText(result));
  url.searchParams.set('url', SHARE_URL);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCard(canvas: HTMLCanvasElement, result: Result) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#07060c';
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(360, 300, 40, 360, 320, 520);
  glow.addColorStop(0, 'rgba(255,61,138,0.55)');
  glow.addColorStop(1, 'rgba(255,61,138,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const lime = ctx.createRadialGradient(980, 120, 20, 980, 140, 340);
  lime.addColorStop(0, 'rgba(223,242,90,0.35)');
  lime.addColorStop(1, 'rgba(223,242,90,0)');
  ctx.fillStyle = lime;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ff3d8a';
  ctx.beginPath();
  ctx.ellipse(150, 210, 54, 64, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6ea';
  ctx.beginPath();
  ctx.ellipse(150, 230, 28, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#141208';
  ctx.beginPath();
  ctx.arc(134, 198, 7, 0, Math.PI * 2);
  ctx.arc(166, 198, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#141208';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(150, 214, 16, 0.3, Math.PI - 0.3);
  ctx.stroke();

  const font = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
  const num = `"Outfit", ${font}`;

  ctx.fillStyle = '#dff25a';
  ctx.font = `800 28px ${num}`;
  ctx.textAlign = 'left';
  ctx.fillText('DOPA TYPE  ·  60SEC', 280, 118);

  ctx.fillStyle = '#f6f1e7';
  ctx.font = `900 42px ${font}`;
  ctx.fillText('ドパドパタイピング', 280, 168);

  const dopaLabel = formatDopa(result.dopa);
  let size = 112;
  ctx.textAlign = 'left';
  ctx.font = `800 ${size}px ${num}`;
  while (size > 64 && ctx.measureText(dopaLabel).width > 620) {
    size -= 6;
    ctx.font = `800 ${size}px ${num}`;
  }
  ctx.fillStyle = '#dff25a';
  ctx.fillText(dopaLabel, 280, 310);
  const dopaWidth = ctx.measureText(dopaLabel).width;
  ctx.fillStyle = '#f6f1e7';
  ctx.font = `700 36px ${font}`;
  ctx.fillText('ドパ', 296 + dopaWidth, 310);

  const rank = rankOf(result.dopa);
  ctx.fillStyle = '#ffd36a';
  ctx.font = `900 36px ${font}`;
  ctx.fillText(rank.name, 280, 372);

  const stats = [
    `${result.maxCombo} コンボ`,
    `精度 ${accuracyOf(result)}%`,
    `${kpmOf(result)} 打/分`,
    `${result.words} 語`,
  ];
  ctx.font = `700 28px ${font}`;
  stats.forEach((label, i) => {
    const x = 72 + i * 280;
    roundRect(ctx, x, 450, 256, 64, 32);
    ctx.fillStyle = 'rgba(246,241,231,0.08)';
    ctx.fill();
    ctx.fillStyle = '#f6f1e7';
    ctx.fillText(label, x + 24, 492);
  });

  ctx.fillStyle = 'rgba(246,241,231,0.62)';
  ctx.font = `700 24px ${num}`;
  ctx.fillText('games.furutahss.com/dopa-type', 72, 575);
}

function blobOf(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png');
  });
}

function download(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dopadopa-typing.png';
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyOrDownload(canvas: HTMLCanvasElement): Promise<'copied' | 'downloaded'> {
  const blob = await blobOf(canvas);
  const item = typeof ClipboardItem === 'undefined' ? null : new ClipboardItem({ 'image/png': blob });
  if (item && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([item]);
      return 'copied';
    } catch {
      download(blob);
      return 'downloaded';
    }
  }
  download(blob);
  return 'downloaded';
}
