// Quiet scene lighting, independent of the screenplay and character palette.
export const ACTOR_LIGHT: Record<string, 'warm' | 'cold'> = {
  hut: 'warm', study: 'warm', palace: 'warm', home: 'warm', ritual: 'warm',
  cave: 'cold', river: 'cold', snow: 'cold', underwater: 'cold',
  'light-river': 'cold', nightmare: 'cold', marsh: 'cold',
  'bedroom-evening': 'warm', 'snow-night': 'cold',
  'modern-dorm-quiet-r2': 'cold', 'modern-dorm': 'cold',
  'modern-street-arrival-r2': 'warm', 'modern-library': 'warm',
  'modern-office': 'warm', 'modern-mountain-path': 'cold',
  'modern-sunset': 'warm',
};
