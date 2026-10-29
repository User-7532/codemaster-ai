import { useEffect, useState } from 'react';
import { defaultWallpaper } from '@/lib/wallpapers';

const KEY = 'codedojo.wallpaper';
const EVENT = 'codedojo-wallpaper';

export function readWallpaper() {
  try {
    return localStorage.getItem(KEY) || defaultWallpaper;
  } catch {
    return defaultWallpaper;
  }
}

export function changeWallpaper(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export default function useWallpaper() {
  const [id, setId] = useState(readWallpaper);

  useEffect(() => {
    const sync = () => setId(readWallpaper());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return [id, changeWallpaper];
}