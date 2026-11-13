/** Let the first screen and its fonts settle before speculative network work. */
export function afterFirstScreen(task: () => void, delay = 1800): () => void {
  let cancelled = false, timer = 0, idle = 0;
  void document.fonts.ready.then(() => {
    if (cancelled) return;
    timer = window.setTimeout(() => {
      if (cancelled) return;
      if (window.requestIdleCallback) idle = window.requestIdleCallback(() => { if (!cancelled) task(); }, { timeout: 4000 });
      else task();
    }, delay);
  });
  return () => { cancelled = true; clearTimeout(timer); if (idle) window.cancelIdleCallback(idle); };
}
