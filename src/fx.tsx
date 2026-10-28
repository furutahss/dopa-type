import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  g: number;
  shape: 'dot' | 'star' | 'streak';
  rot: number;
  vr: number;
};

type Ring = { x: number; y: number; life: number; max: number; color: string; start: number; grow: number };
type Glow = { x: number; y: number; life: number; max: number; color: string; radius: number };

type Emit = {
  x: number;
  y: number;
  count: number;
  power: number;
  colors: string[];
  ring: boolean;
};

const listeners = new Set<(emit: Emit) => void>();

const PALETTE = [
  ['#dff25a', '#fff6ea', '#ffd36a'],
  ['#ff3d8a', '#dff25a', '#ffffff'],
  ['#ffd36a', '#ff3d8a', '#fff4b8'],
  ['#7af7ff', '#ff3d8a', '#dff25a'],
  ['#ffffff', '#dff25a', '#ff3d8a'],
];

export function burstAt(x: number, y: number, tierIn: number, power = 1, miss = false) {
  const tier = Math.max(0, Math.min(4, tierIn));
  const colors = miss ? ['#ff8eae', '#ffe3ec', '#ffffff'] : PALETTE[tier];
  const emit: Emit = {
    x,
    y,
    count: Math.round((miss ? 12 : 11 + tier * 4) * Math.max(0.55, power)),
    power,
    colors,
    ring: !miss && power >= 1.35,
  };
  listeners.forEach((fn) => fn(emit));
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = rot + (i * Math.PI) / 4;
    const d = i % 2 === 0 ? r : r * 0.4;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 === 0 ? outer : inner;
    return `${cx + Math.cos(a) * d},${cy + Math.sin(a) * d}`;
  }).join(' ');
}

export function Mascot({ mood, pop }: { mood: number; pop: number }) {
  const wild = mood >= 4;
  const star = mood >= 3;
  const grin = mood >= 2;
  return (
    <div className={`mascot-wrap mood-${mood}`} aria-hidden>
      <svg key={pop} className="mascot" viewBox="0 0 200 220">
        <defs>
          <radialGradient id="dopa-drop" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor={wild ? '#fff6b0' : '#ffb0cc'} />
            <stop offset="48%" stopColor={mood >= 2 ? '#ff3d8a' : '#ff5c98'} />
            <stop offset="100%" stopColor="#b01258" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="206" rx="48" ry="8" fill="rgba(0,0,0,0.35)" />
        <path
          d="M100 18c36 0 66 34 66 78 0 50-28 92-66 92S34 146 34 96C34 52 64 18 100 18z"
          fill="url(#dopa-drop)"
        />
        <ellipse cx="76" cy="68" rx="18" ry="10" fill="rgba(255,255,255,0.38)" />
        <ellipse cx="100" cy="132" rx="44" ry="38" fill="#fff6ea" />
        {star ? (
          <>
            <polygon points={starPoints(74, 108, 16, 7)} fill="#1a120c" />
            <polygon points={starPoints(126, 108, 16, 7)} fill="#1a120c" />
          </>
        ) : (
          <>
            <ellipse cx="74" cy="108" rx="10" ry={mood >= 1 ? 12 : 11} fill="#1a120c" />
            <ellipse cx="126" cy="108" rx="10" ry={mood >= 1 ? 12 : 11} fill="#1a120c" />
            <circle cx="77" cy="104" r="3.2" fill="#fff" />
            <circle cx="129" cy="104" r="3.2" fill="#fff" />
          </>
        )}
        <ellipse cx="56" cy="128" rx="8" ry="5" fill="#ff9abb" />
        <ellipse cx="144" cy="128" rx="8" ry="5" fill="#ff9abb" />
        {grin ? (
          <path
            d="M76 140c8 18 40 18 48 0"
            stroke="#1a120c"
            strokeWidth="4"
            fill={wild ? '#ff5d78' : 'none'}
            strokeLinecap="round"
          />
        ) : (
          <path d="M86 146c5 8 22 8 28 0" stroke="#1a120c" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {mood >= 1 && <circle cx="162" cy="52" r="6" fill="#dff25a" />}
        {mood >= 2 && <circle cx="40" cy="64" r="4" fill="#fff" />}
        {wild && <circle cx="168" cy="86" r="5" fill="#7af7ff" />}
      </svg>
    </div>
  );
}

export function Fx({ ambient, heat }: { ambient: boolean; heat: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef(ambient);
  const heatRef = useRef(heat);
  ambientRef.current = ambient;
  heatRef.current = heat;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const parts: Particle[] = [];
    const rings: Ring[] = [];
    const glows: Glow[] = [];
    let raf = 0;
    let running = true;
    let lastSpawn = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (emit: Emit) => {
      const count = reduce ? Math.min(8, emit.count) : emit.count;
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = (1.8 + Math.random() * 2.8) * emit.power;
        const kick = 28 + Math.random() * (16 + emit.power * 22);
        const roll = Math.random();
        const shape = roll > 0.78 ? 'star' : roll > 0.46 ? 'streak' : 'dot';
        parts.push({
          x: emit.x + Math.cos(a) * kick,
          y: emit.y + Math.sin(a) * kick,
          vx: Math.cos(a) * s * 7.2,
          vy: Math.sin(a) * s * 6.4 - 1.8,
          life: 0,
          max: 460 + Math.random() * 280,
          size: (shape === 'star' ? 5 : 3) + Math.random() * 4.2 * Math.min(emit.power, 2.2),
          color: emit.colors[i % emit.colors.length] ?? '#fff',
          g: shape === 'streak' ? 0.02 : 0.05 + Math.random() * 0.05,
          shape,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
        });
      }
      if (parts.length > 420) parts.splice(0, parts.length - 420);
      if (!emit.ring || reduce) {
        if (!reduce && emit.power >= 0.8) {
          glows.push({
            x: emit.x,
            y: emit.y,
            life: 0,
            max: 180,
            color: emit.colors[0] ?? '#fff',
            radius: 36 + emit.power * 28,
          });
        }
        return;
      }
      const start = 36 + emit.power * 18;
      rings.push({
        x: emit.x,
        y: emit.y,
        life: 0,
        max: 380,
        color: emit.colors[0] ?? '#fff',
        start,
        grow: 90 + emit.power * 50,
      });
      if (emit.power >= 2) {
        rings.push({
          x: emit.x,
          y: emit.y,
          life: 0,
          max: 460,
          color: emit.colors[1] ?? '#fff',
          start: start + 18,
          grow: 130 + emit.power * 40,
        });
      }
      glows.push({
        x: emit.x,
        y: emit.y,
        life: 0,
        max: 240,
        color: emit.colors[0] ?? '#fff',
        radius: 70 + emit.power * 46,
      });
    };

    const onEmit = (emit: Emit) => spawn(emit);
    listeners.add(onEmit);

    const frame = (now: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const heatNow = heatRef.current;
      const sparkEvery = heatNow >= 4 ? 60 : heatNow >= 3 ? 90 : heatNow >= 2 ? 140 : 260;
      if (!reduce && (ambientRef.current || heatNow >= 1) && now - lastSpawn > sparkEvery) {
        lastSpawn = now;
        const side = Math.random() > 0.5;
        const x = side
          ? Math.random() * window.innerWidth * 0.16
          : window.innerWidth * (0.84 + Math.random() * 0.16);
        parts.push({
          x,
          y: window.innerHeight + 8,
          vx: (Math.random() - 0.5) * (0.6 + heatNow * 0.25),
          vy: -0.7 - Math.random() * (0.8 + heatNow * 0.35),
          life: 0,
          max: 2400,
          size: 2.5 + Math.random() * (2 + heatNow),
          color: Math.random() > 0.55 ? '#dff25a' : Math.random() > 0.5 ? '#ff3d8a' : '#ffd36a',
          g: 0,
          shape: Math.random() > 0.7 ? 'star' : 'dot',
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.08,
        });
      }
      for (let i = glows.length - 1; i >= 0; i -= 1) {
        const glow = glows[i];
        glow.life += 16;
        const t = glow.life / glow.max;
        if (t >= 1) {
          glows.splice(i, 1);
          continue;
        }
        const radius = glow.radius * (0.7 + t * 0.8);
        const paint = ctx.createRadialGradient(glow.x, glow.y, 4, glow.x, glow.y, radius);
        paint.addColorStop(0, glow.color);
        paint.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = (1 - t) * 0.38;
        ctx.fillStyle = paint;
        ctx.beginPath();
        ctx.arc(glow.x, glow.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        p.life += 16;
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const t = p.life / p.max;
        if (t >= 1) {
          parts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        const size = p.size * (1 - t * 0.35);
        if (p.shape === 'star') drawStar(ctx, p.x, p.y, size, p.rot);
        else if (p.shape === 'streak') {
          ctx.lineWidth = Math.max(1.5, size * 0.45);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const ring = rings[i];
        ring.life += 16;
        const t = ring.life / ring.max;
        if (t >= 1) {
          rings.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 4 * (1 - t * 0.65);
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.start + t * ring.grow, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      listeners.delete(onEmit);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="fx" />;
}
