// Explicitly staged silent appearances. Mentions in memories, comparisons and
// dialogue never create a person on stage automatically.
export const PRESENCE: Record<string, string[]> = {
  '0-1:8:0': ['shen'],
  '0-1:8:1': ['shen'],
  'B-1:17:0': ['xu'],
  'B-1:20:2': ['amao'],
  'B-1:22:4': ['xu'],
  'B-12-1:3:1': ['yu'],
  'B-12-1:18:1': ['xu'],
  '终-1:8:2': ['xu'],
  '终-1:22:4': ['yu'],
  '终-1:27:0': ['yu'],
  '终-4:12:4': ['shen'],
  'B-2:12:2': ['mi'],
  'B-2:12:4': ['mi'],
  'B-2:12:6': ['mi'],
  'B-5-5:8:4': ['mi'],
  'B-7-2:7:1': ['mi'],
  'B-7-5:13:2': ['mi'],
  'B-10-4:11:4': ['mi'],
  'B-11:3:0': ['xu'],
  'B-11:3:3': ['mi'],
  'B-12-1:3:6': ['mi'],
  'B-12-1:16:3': ['mi'],
  'B-12-2:3:0': ['xu'],
  'B-1:8:0': ['mi'],
  'B-1:20:0': ['mi'],
  'B-13:8:2': ['mi'],
  'B-13:28:0': ['mi'],
  '终-1:22:2': ['mi'],
};

export const presenceForBeat = (beatId: string): readonly string[] => PRESENCE[beatId] ?? [];
