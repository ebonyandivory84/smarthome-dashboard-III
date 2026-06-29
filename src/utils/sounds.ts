import type { SoundKey } from '../types/dashboard';

const BASE = import.meta.env.BASE_URL;

let volume = 0.55;
let enabled = true;

const cache: Partial<Record<SoundKey, HTMLAudioElement>> = {};

function getAudio(key: SoundKey): HTMLAudioElement {
  if (!cache[key]) {
    const a = new Audio(`${BASE}sounds/${key}.mp3`);
    a.preload = 'auto';
    cache[key] = a;
  }
  return cache[key]!;
}

export function initSounds(keys: SoundKey[] = ALL_SOUNDS) {
  keys.forEach(getAudio);
}

export function playSound(key: SoundKey) {
  if (!enabled) return;
  try {
    const a = getAudio(key);
    a.volume = Math.max(0, Math.min(1, volume));
    a.currentTime = 0;
    a.play().catch(() => {/* autoplay blocked */});
  } catch {/* ignore */}
}

export function setSoundVolume(v: number) { volume = v; }
export function setSoundEnabled(v: boolean) { enabled = v; }

export const ALL_SOUNDS: SoundKey[] = [
  'tap1', 'tap2', 'tap3', 'tap4', 'tap5',
  'maximize', 'minimize', 'confirm', 'scroll', 'error',
];
