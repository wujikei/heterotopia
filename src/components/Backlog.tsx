import { useEffect, useMemo, useRef } from 'react';
import { ArrowUpLeft, ChevronRight } from 'lucide-react';
import { historyTargets } from '../reading';
import type { GameState, Profile } from '../types';

export function Backlog({ state, profile, onReplay }: { state: GameState | null; profile: Profile; onReplay: (index: number) => void }) {
  const end = useRef<HTMLDivElement>(null);
  const targets = useMemo(() => state ? historyTargets(state, profile) : new Map<number, string>(), [state, profile]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="history-content">
    {!!targets.size && <p className="history-note">点亮的句子，可以回到原处重读。已经作出的选择，会留在回声里。</p>}
    {state?.history.length ? state.history.map((entry, index) => {
      const replayable = targets.has(index);
      const content = <><span className={`history-speaker ${entry.speaker && entry.kind !== 'choice' ? 'history-speaker--seal' : ''}`}>{entry.kind === 'choice' ? '择' : entry.speaker || '叙'}</span><span className="history-copy">{entry.kind === 'choice' && <ChevronRight size={14} aria-hidden="true" />}{entry.text}</span>{replayable && <ArrowUpLeft className="history-replay-mark" size={16} aria-hidden="true" />}</>;
      const className = `history-entry ${entry.kind === 'choice' ? 'history-entry--choice' : ''} ${replayable ? 'history-entry--replay' : ''}`;
      return replayable
        ? <button className={className} key={`${entry.id}-${index}`} onClick={() => onReplay(index)} aria-label={`重读：${entry.text}`} title="回到这句话">{content}</button>
        : <div className={className} key={`${entry.id}-${index}`}>{content}</div>;
    }) : <p className="empty-note">刚翻开的书，还没有远去的话。</p>}
    <div ref={end} />
  </div>;
}
