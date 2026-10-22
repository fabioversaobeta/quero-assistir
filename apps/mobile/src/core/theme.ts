export const colors = {
  bg: '#0f1115',
  panel: '#181b22',
  border: '#2a2f3a',
  text: '#f2f4f8',
  muted: '#9aa3b2',
  like: '#3ecf8e',
  nope: '#ff4d6d',
  accent: '#ff4d6d',
} as const;

/** Cores oficiais da classificação indicativa brasileira. */
export const ratingColors: Record<string, string> = {
  L: '#00a859',
  '10': '#0a8fd8',
  '12': '#f5c400',
  '14': '#f58220',
  '16': '#e2231a',
  '18': '#111111',
};
