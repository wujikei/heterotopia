// Explicitly staged silent appearances. Mentions in memories, comparisons and
// dialogue never create a person on stage automatically.
export const PRESENCE: Record<string, string[]> = {
  'B-1:8:0': ['mi'],
  'B-1:20:0': ['mi'],
  'B-13:8:2': ['mi'],
  'B-13:28:0': ['mi'],
  '终-1:22:2': ['mi'],
};

export const presenceForBeat = (beatId: string): readonly string[] => PRESENCE[beatId] ?? [];
