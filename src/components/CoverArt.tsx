import { useState } from 'react';
import { Disc3 } from 'lucide-react';
import { COVER_ASSETS } from '../lib/covers.ts';
import type { CoverVariant } from '../types/music.ts';

interface CoverArtProps {
  variant?: CoverVariant;
  alt: string;
  className?: string;
}

export function CoverArt({
  variant = 'focus',
  alt,
  className = 'w-full aspect-square',
}: CoverArtProps) {
  const [failed, setFailed] = useState(false);
  const asset = COVER_ASSETS[variant] || COVER_ASSETS.focus;

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${asset.gradientClass} text-zinc-500 dark:text-zinc-400 ${className}`}
        aria-label={alt}
      >
        <Disc3 className="h-8 w-8 stroke-[1.5]" />
      </div>
    );
  }

  return (
    <img
      src={asset.src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-zinc-100 dark:bg-zinc-900 ${className}`}
    />
  );
}
