export const palette = {
  bg: '#040811',
  bgAlt: '#0a1120',
  panel: 'rgba(18, 24, 38, 0.92)',
  border: 'rgba(157, 173, 214, 0.14)',
  accent: '#5c7cff',
  pink: '#ff4db8',
  green: '#6cff8f',
  red: '#ff6b7a',
  yellow: '#ffd166',
  text: '#f7f8fc',
  muted: '#8c94ad',
} as const;

export const widgetColors = {
  solar: { pv: '#ffd166', home: '#5c7cff', grid: '#6cff8f', battery: '#ff9f1c' },
  energy: { pv: '#ffd166', home: '#5c7cff', battery: '#ff9f1c', grid: '#6cff8f' },
  wallbox: { charging: '#6cff8f', idle: '#8c94ad', error: '#ff6b7a' },
  heating: { active: '#ff6b7a', idle: '#8c94ad', off: '#5c7cff' },
} as const;

/** Returns a hex with given alpha 0-1 */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function resolveAccent(appearance?: { accentColor?: string }): string {
  return appearance?.accentColor ?? palette.accent;
}
