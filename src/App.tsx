import { useCallback, useEffect, useState } from 'react';
import { Fx, burstAt } from './fx';
import { setMuted, unlockAudio } from './game/audio';
import type { Result } from './game/scoring';
import { loadBest, loadMute, saveBest, saveMute, type Best } from './game/storage';
import { PlayScreen, ResultScreen, TitleScreen } from './screens';

type Phase = 'title' | 'play' | 'result';

export function App() {
  const [phase, setPhase] = useState<Phase>('title');
  const [best, setBest] = useState<Best | null>(() => loadBest());
  const [muted, setMuteState] = useState(() => loadMute());
  const [tier, setTier] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setMuted(muted);
    saveMute(muted);
  }, [muted]);

  const onTier = useCallback((next: number) => setTier(next), []);

  const start = useCallback(() => {
    unlockAudio();
    setTier(0);
    setPhase('play');
  }, []);

  const finish = useCallback((next: Result) => {
    const saved = saveBest(next);
    setBest(saved.best);
    setIsNew(saved.isNew);
    setResult(next);
    setTier(0);
    setPhase('result');
    burstAt(window.innerWidth * 0.14, window.innerHeight * 0.78, 3, 2);
    burstAt(window.innerWidth * 0.86, window.innerHeight * 0.78, 3, 2);
    burstAt(window.innerWidth * 0.5, window.innerHeight * 0.16, 4, 1.7);
  }, []);

  return (
    <div className="world" data-tier={phase === 'play' ? tier : 0} data-phase={phase}>
      <Fx ambient={phase !== 'play'} heat={phase === 'play' ? tier : 0} />
      <button
        type="button"
        className="mute"
        onClick={() => setMuteState((value) => !value)}
        aria-pressed={muted}
      >
        {muted ? '音オフ' : '音オン'}
      </button>
      {phase === 'title' && <TitleScreen best={best} onStart={start} />}
      {phase === 'play' && <PlayScreen onFinish={finish} onTier={onTier} />}
      {phase === 'result' && result && <ResultScreen result={result} isNew={isNew} onRetry={start} />}
    </div>
  );
}
