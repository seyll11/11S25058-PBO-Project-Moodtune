import React, { useState } from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.ts';
import type { LyricsThemeExplanation, Song } from '../types/music.ts';

interface ThemeExplainerViewProps {
  songs: Song[];
}

export function ThemeExplainerView({ songs }: ThemeExplainerViewProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LyricsThemeExplanation | null>(null);

  const runExplain = async (
    targetTitle: string,
    targetArtist: string,
    targetGenre?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.explainLyricsTheme({
        title: targetTitle,
        artist: targetArtist,
        genre: targetGenre || undefined,
      });
      setResult(res.explanation);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menjelaskan tema lagu.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;
    await runExplain(title.trim(), artist.trim(), genre.trim());
  };

  const handlePickLibrarySong = (song: Song) => {
    setTitle(song.title);
    setArtist(song.artist);
    setGenre(song.genre);
    runExplain(song.title, song.artist, song.genre);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Input & Library Picker */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50">
            Penjelas Makna &amp; Tema Lagu
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Masukkan judul lagu dan artis untuk memahami tema emosional, pesan
            umum, dan motif di balik lagunya.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="explainer-title"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Judul Lagu
              </label>
              <input
                id="explainer-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Hati-Hati di Jalan"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            <div>
              <label
                htmlFor="explainer-artist"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Artis
              </label>
              <input
                id="explainer-artist"
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Contoh: Tulus"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !title.trim() || !artist.trim()}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>{loading ? 'Menganalisis...' : 'Jelaskan Tema Lagu'}</span>
            </button>
          </form>
        </div>

        {songs.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Pilih dari Koleksi Anda
            </h3>
            <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {songs.slice(0, 15).map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => handlePickLibrarySong(song)}
                  className="flex w-full min-h-[48px] items-center justify-between gap-2 py-2 px-2 text-left rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {song.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {song.artist}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                    Analisis
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Result Area */}
      <div className="lg:col-span-7">
        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {title.trim() && artist.trim() && (
              <button
                type="button"
                onClick={() => runExplain(title.trim(), artist.trim(), genre.trim())}
                disabled={loading}
                className="min-h-[36px] rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900/60 shrink-0"
              >
                Coba Lagi
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4 animate-pulse">
            <div className="h-7 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-24 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
            <div className="h-36 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        )}

        {!loading && !result && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <BookOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-600 stroke-[1.5]" />
            <p className="mt-4 font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Siap membedah tema lagu
            </p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Ketik judul dan artis di panel kiri atau klik salah satu lagu dari
              koleksi Anda untuk membaca penjelasan maknanya.
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
            <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Ringkasan Tema Lagu
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                {result.title}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {result.artist}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Tema Utama
                </p>
                <p className="mt-1 font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  {result.coreTheme}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Nuansa Emosional
                </p>
                <p className="mt-1 font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  {result.emotionalTone}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Makna &amp; Interpretasi Umum
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {result.meaningOverview}
              </p>
            </div>

            {result.keyMotifs.length > 0 && (
              <div>
                <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Motif &amp; Metafora Utama
                </h3>
                <ul className="mt-2 space-y-2 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
                  {result.keyMotifs.map((motif, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="font-mono text-xs text-zinc-400 tabular-nums mt-0.5">
                        0{i + 1}.
                      </span>
                      <span>{motif}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Momen Mendengarkan
              </p>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                {result.listeningContext}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
