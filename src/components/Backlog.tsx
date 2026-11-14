import { localizePage, t, tr, useLocale } from '../i18n';
import { useEffect, useMemo, useRef } from 'react';
import { ArrowUpLeft, ChevronRight } from 'lucide-react';
import { historyTargets } from '../reading';
import { compileScene } from '../engine';
import type { GameState, Profile } from '../types';

export function Backlog({ state, profile, onReplay }: { state: GameState | null; profile: Profile; onReplay: (index: number) => void }) {
  useLocale();
  const end = useRef<HTMLDivElement>(null);
  const targets = useMemo(() => state ? historyTargets(state, profile) : new Map<number, string>(), [state, profile]);
  const innerLines = useMemo(() => {
    const found = new Set<string>();
    if (state) for (const sceneId of new Set(state.history.map(entry => entry.sceneId))) {
      try { for (const beat of compileScene(sceneId, profile, state)) if (beat.kind === 'text' && beat.mood.includes('内心')) found.add(beat.id); }
      catch { /* An unavailable old scene still remains readable in the log. */ }
    }
    return found;
  }, [state, profile]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="history-content">
    {tr(!!targets.size && <p className="history-note">{t("点亮的句子，可以回到原处重读。已经作出的选择，会留在回声里。")}</p>)}
    {tr(state?.history.length ? state.history.map((entry, index) => {
      const replayable = targets.has(index);
      const narration = entry.kind !== 'choice' && !entry.speaker;
      const content = <>{tr(!narration && <span className={`history-speaker ${entry.speaker && entry.kind !== 'choice' ? 'history-speaker--seal' : ''}`}>{tr(entry.kind === 'choice' ? '择' : entry.speaker)}</span>)}<span className="history-copy">{tr(entry.kind === 'choice' && <ChevronRight size={14} aria-hidden="true" />)}{localizePage(entry.id, entry.text)}</span>{tr(replayable && <ArrowUpLeft className="history-replay-mark" size={16} aria-hidden="true" />)}</>;
      const className = `history-entry ${entry.kind === 'choice' ? 'history-entry--choice' : ''} ${narration ? 'history-entry--narration' : ''} ${innerLines.has(entry.id) ? 'history-entry--inner' : ''} ${replayable ? 'history-entry--replay' : ''}`;
      return replayable
        ? <button className={className} key={`${entry.id}-${index}`} onClick={() => onReplay(index)} aria-label={tr(t("重读：{0}", localizePage(entry.id, entry.text)))} title={t("回到这句话")}>{tr(content)}</button>
        : <div className={className} key={`${entry.id}-${index}`}>{tr(content)}</div>;
    }) : <p className="empty-note">{t("刚翻开的书，还没有远去的话。")}</p>)}
    <div ref={end} />
  </div>;
}
