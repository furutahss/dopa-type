import { useEffect, useRef, useState } from 'react';
import { Mascot } from './fx';
import { copyOrDownload, drawCard, openXShare } from './game/share';
import { formatDopa, formatDopaFull } from './game/format';
import { GAME_MS, accuracyOf, kpmOf, rankOf, TIER_NAME, type Result } from './game/scoring';
import type { Best } from './game/storage';
import { usePlay } from './game/usePlay';

export function TitleScreen({ best, onStart }: { best: Best | null; onStart: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <section className="title">
      <div className="title-copy">
        <p className="kicker">60秒 · PCキーボード</p>
        <h1>
          <span className="logo-top">ドパドパ</span>
          <span className="logo-sub">タイピング</span>
        </h1>
        <p className="lead">打つたびに音が上がって、画面が盛れていく。</p>
        <ul className="howto">
          <li>出たことばを、ローマ字で打つ。</li>
          <li>コンボが伸びると FEVER。ミスるとコンボだけが切れる。</li>
          <li>出したドパは減らない。半角英数で。</li>
        </ul>
        <button type="button" className="btn primary big" onClick={onStart}>
          はじめる
        </button>
        <p className="best">
          {best
            ? `さいこう ${formatDopa(best.dopa)}ドパ · コンボ ${best.maxCombo}`
            : 'まだ記録がない'}
        </p>
        <p className="hint">Enter でもはじまる</p>
      </div>
      <div className="title-mascot">
        <Mascot mood={2} pop={0} />
      </div>
    </section>
  );
}

function Timer({ left }: { left: number }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, left / GAME_MS));
  const urgent = left <= 10_000;
  return (
    <div className={`timer${urgent ? ' urgent' : ''}`}>
      <svg viewBox="0 0 72 72" width="84" height="84" aria-hidden>
        <circle className="ring-bg" cx="36" cy="36" r={radius} />
        <circle
          className="ring"
          cx="36"
          cy="36"
          r={radius}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - ratio)}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <strong>{Math.ceil(left / 1000)}</strong>
    </div>
  );
}

export function PlayScreen({
  onFinish,
  onTier,
}: {
  onFinish: (result: Result) => void;
  onTier: (tier: number) => void;
}) {
  const view = usePlay(onFinish);
  useEffect(() => {
    onTier(view.tier);
  }, [view.tier, onTier]);

  const tierName = TIER_NAME[view.tier];

  return (
    <section className="play">
      <header className="hud">
        <Timer left={view.left} />
        <div className="dopa-wrap">
          <span className="dopa-label">DOPA</span>
          <div className="dopa">
            <span key={view.punch}>{formatDopa(view.dopa)}</span>
          </div>
          <div className="floats">
            {view.floats.slice(-1).map((float) => (
              <span key={float.id} className={`floater${float.big ? ' big' : ''}`}>
                {float.text}
              </span>
            ))}
          </div>
        </div>
        <div className={`combo${view.combo >= 15 ? ' hot' : ''}`}>
          <strong key={view.combo}>{view.combo}</strong>
          <span>COMBO</span>
        </div>
      </header>

      <div
        className="stage"
        style={{ transform: `translate(${view.shake.x}px, ${view.shake.y}px)` }}
      >
        {view.go && <div className="go">GO</div>}
        <div className="label">{view.word.label}</div>
        <div className={`groups${view.missSeq ? ' shaken' : ''}`} key={view.missSeq}>
          {view.guides.map((guide, index) => (
            <span className={`group ${guide.status}`} key={`${guide.kana}-${index}`}>
              <span className="kana" key={guide.status === 'current' ? guide.typed : 'k'}>
                {guide.kana}
              </span>
              <span className="roma">
                <span className="ok">{guide.romaji.slice(0, guide.typed)}</span>
                {guide.status === 'current' && <i className="caret" />}
                <span className="rest">{guide.romaji.slice(guide.typed)}</span>
              </span>
            </span>
          ))}
        </div>
        {tierName && (
          <div className="banner" key={tierName}>
            {tierName}
          </div>
        )}
      </div>

      <footer className="dock">
        <p className="next">
          NEXT <b>{view.next.label}</b>
          <span className="esc">Esc でおわる</span>
        </p>
        <Mascot mood={view.tier} pop={view.pop} />
      </footer>
      {view.ime && <div className="ime">日本語入力がオンです。半角英数にしてね。</div>}
      {view.punch > 0 && <div className={`flash boom-${view.boom}`} key={view.punch} />}
    </section>
  );
}

function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 680);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export function ResultScreen({
  result,
  isNew,
  onRetry,
}: {
  result: Result;
  isNew: boolean;
  onRetry: () => void;
}) {
  const shown = useCountUp(result.dopa);
  const rank = rankOf(result.dopa);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onRetry();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRetry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => drawCard(canvas, result);
    paint();
    void document.fonts.ready.then(paint);
  }, [result]);

  return (
    <section className="result">
      {isNew && <p className="new">NEW RECORD</p>}
      <p className="rank-stamp">{rank.name}</p>
      <p className="rank-line">{rank.line}</p>
      <p className="result-dopa">
        <strong>{formatDopa(shown)}</strong>
        <span>ドパ</span>
      </p>
      {formatDopa(result.dopa) !== formatDopaFull(result.dopa) && (
        <p className="result-full">{formatDopaFull(result.dopa)}</p>
      )}
      <ul className="stats">
        <li>
          <b>{result.maxCombo}</b>
          <span>最大コンボ</span>
        </li>
        <li>
          <b>{accuracyOf(result)}%</b>
          <span>精度</span>
        </li>
        <li>
          <b>{kpmOf(result)}</b>
          <span>打/分</span>
        </li>
        <li>
          <b>{result.words}</b>
          <span>クリア</span>
        </li>
      </ul>
      <div className="actions">
        <button type="button" className="btn primary" onClick={onRetry}>
          もういちど
        </button>
        <button type="button" className="btn x" onClick={() => openXShare(result)}>
          Xにポスト
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            void copyOrDownload(canvas)
              .then((mode) => {
                setNote(
                  mode === 'copied'
                    ? '画像をコピーした。ポストに貼れる。'
                    : '画像を保存した。ポストに添付してね。',
                );
              })
              .catch(() => setNote('画像を作れなかった。もう一度押してね。'));
          }}
        >
          結果画像
        </button>
      </div>
      <p className="hint">{note || 'Enter でもういちど · 画像を添付するとタイムラインで映える'}</p>
      <canvas ref={canvasRef} width={1200} height={630} hidden />
    </section>
  );
}
