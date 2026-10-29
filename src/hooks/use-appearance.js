import { useEffect, useState } from 'react';
import { applyAppearance, defaultAppearance } from '@/lib/appearance';

const KEY = 'codedojo.appearance';
const EVENT = 'codedojo-appearance';

export function readAppearance() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultAppearance };
    return { ...defaultAppearance, ...JSON.parse(raw) };
  } catch {
    return { ...defaultAppearance };
  }
}

export function updateAppearance(patch) {
  const next = { ...readAppearance(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applyAppearance(next);
  window.dispatchEvent(new Event(EVENT));
  return next;
}

export default function useAppearance() {
  const [settings, setSettings] = useState(readAppearance);

  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

  useEffect(() => {
    const sync = () => setSettings(readAppearance());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return [settings, updateAppearance];
}