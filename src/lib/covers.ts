import type { CoverVariant } from '../types/music.ts';

export const HERO_STUDIO_IMAGE =
  '/src/assets/images/hero_studio_vinyl_1795061406524.jpg';

export const COVER_ASSETS: Record<
  CoverVariant,
  { src: string; label: string; gradientClass: string }
> = {
  focus: {
    src: '/src/assets/images/cover_calm_focus_1795061406206.jpg',
    label: 'Fokus & Tenang',
    gradientClass:
      'from-blue-600/20 via-zinc-200 to-zinc-100 dark:from-blue-500/20 dark:via-zinc-800 dark:to-zinc-900',
  },
  rain: {
    src: '/src/assets/images/cover_melancholy_rain_1795061406154.jpg',
    label: 'Hujan & Reflektif',
    gradientClass:
      'from-slate-600/30 via-zinc-300 to-zinc-200 dark:from-slate-700/40 dark:via-zinc-800 dark:to-zinc-900',
  },
  morning: {
    src: '/src/assets/images/cover_energetic_morning_1795061406315.jpg',
    label: 'Pagi & Energik',
    gradientClass:
      'from-sky-500/20 via-zinc-200 to-zinc-100 dark:from-sky-500/20 dark:via-zinc-800 dark:to-zinc-900',
  },
};
