// Extra breathing room after the complete line in automatic reading only.
// Manual advance and read-skip remain immediate. No text or IDs are rewritten.
export const READING_HOLDS: Record<string, number> = {
  '0-1:3:1': 650,
  '0-1:8:1': 450,
  'B-1:20:2': 700,
  'B-1:22:2': 1100,
  'B-12-1:18:1': 900,
  'B-12-2:4:0': 1000,
  'B-12-2:9:4': 1200,
  'B-12-2:9:7': 1400,
  '终-1:7:0': 700,
  '终-1:19:0': 900,
  '终-1:22:3': 1000,
  '终-1:28:0': 600,
  '终-1:29:0': 1000,
};
