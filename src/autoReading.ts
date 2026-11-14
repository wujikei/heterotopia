/** Reading time starts after the typewriter finishes, not at the first letter. */
export function autoDelayFor(text: string, autoDelay: number): number {
  const pace = Number.isFinite(autoDelay) ? Math.min(10, Math.max(2, autoDelay)) : 4;
  // Count code points so a single supplementary character is not timed twice.
  const characters = Array.from(text.trim()).length;
  return Math.min(9000, 600 + pace * 250 + characters * 55);
}
