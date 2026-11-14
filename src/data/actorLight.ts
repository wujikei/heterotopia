// Quiet scene lighting, independent of the screenplay and character palette.
export const ACTOR_LIGHT: Record<string, 'warm' | 'cold'> = {
  hut: 'warm', study: 'warm', palace: 'warm', home: 'warm', ritual: 'warm',
  cave: 'cold', river: 'cold', snow: 'cold', underwater: 'cold',
  'light-river': 'cold', nightmare: 'cold', marsh: 'cold',
  'bedroom-evening': 'warm', 'snow-night': 'cold',
};
