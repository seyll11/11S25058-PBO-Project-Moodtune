import { useEffect, useState } from 'react';
import { BookOpen, X, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.ts';
import type { LyricsThemeExplanation } from '../types/music.ts';

interface ThemeExplainerDrawerProps {
  target: { title: string; artist: string; genre?: string } | null;
  onClose: () => void;
}

export function ThemeExplainerDrawer({
  target,
  onClose,
}: ThemeExplainerDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] =
    useState<LyricsThemeExplanation | null>(null);

  useEffect(() => {
    if (!target) {
      setExplanation(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setExplanation(null);

    api
      .explainLyricsTheme(target)
      .then((res) => {
        if (!cancelled) {
          setExplanation(res.explanation);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal memuat analisis tema lagu.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-drawer-title"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              AI Lyrics Theme Explainer
            </p>
            <h2
              id="theme-drawer-title"
              className="mt-1 font-display text-xl font-bold text-zinc-950 dark:text-zinc-50 truncate"
            >
              {target.title}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {target.artist}
              {target.genre ? ` · ${target.genre}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel penjelasan tema"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-20 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
              <div className="h-32 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {explanation && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Tema Utama
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    {explanation.coreTheme}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Nuansa Emosional
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    {explanation.emotionalTone}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Makna &amp; Interpretasi Umum</span>
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {explanation.meaningOverview}
                </p>
              </div>

              {explanation.keyMotifs.length > 0 && (
                <div>
                  <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Motif &amp; Metafora Utama
                  </h3>
                  <ul className="mt-2.5 space-y-2 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
                    {explanation.keyMotifs.map((motif, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="font-mono text-xs text-zinc-400 tabular-nums mt-0.5">
                          0{idx + 1}.
                        </span>
                        <span>{motif}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Momen Mendengarkan yang Pas
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {explanation.listeningContext}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
