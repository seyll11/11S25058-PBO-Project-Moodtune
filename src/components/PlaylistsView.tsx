import { useState } from 'react';
import { Pencil, Plus, Trash2, ArrowUpRight, Sparkles } from 'lucide-react';
import { CoverArt } from './CoverArt.tsx';
import type { Playlist } from '../types/music.ts';

interface PlaylistsViewProps {
  playlists: Playlist[];
  loading: boolean;
  onCreatePlaylist: () => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: number) => Promise<void>;
  onSelectPlaylist: (playlistId: number) => void;
  onOpenAiGenerator: () => void;
}

export function PlaylistsView({
  playlists,
  loading,
  onCreatePlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onSelectPlaylist,
  onOpenAiGenerator,
}: PlaylistsViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleConfirmDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDeletePlaylist(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-3"
          >
            <div className="aspect-square w-full rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800/70 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
        <div className="mx-auto h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <CoverArt
            variant="rain"
            alt="Ilustrasi playlist kosong"
            className="h-full w-full"
          />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-zinc-950 dark:text-zinc-50">
          Belum ada playlist tersimpan
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Buat playlist manual dari koleksi lagu Anda, atau gunakan AI Playlist
          Generator untuk menyusun playlist otomatis berdasarkan tema dan mood.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCreatePlaylist}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Playlist Baru</span>
          </button>
          <button
            type="button"
            onClick={onOpenAiGenerator}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            <span>Buat Otomatis dengan AI</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          {playlists.length} playlist tersimpan
        </p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAiGenerator}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Buat Otomatis AI</span>
          </button>
          <button
            type="button"
            onClick={onCreatePlaylist}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Playlist Baru</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((pl) => (
          <article
            key={pl.id}
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <button
              type="button"
              onClick={() => onSelectPlaylist(pl.id)}
              className="block w-full text-left focus:outline-none"
            >
              <div className="relative overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
                <CoverArt
                  variant={pl.coverVariant}
                  alt={pl.name}
                  className="aspect-[4/3] w-full transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50 line-clamp-1">
                    {pl.name}
                  </h3>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mt-1 transition-colors" />
                </div>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono tabular-nums">
                    {pl.trackCount} lagu
                  </span>
                  {pl.moodTag && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>{pl.moodTag}</span>
                    </>
                  )}
                </p>

                {pl.description && (
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {pl.description}
                  </p>
                )}
              </div>
            </button>

            <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3 mt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onSelectPlaylist(pl.id)}
                className="min-h-[40px] text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Buka Playlist
              </button>

              {confirmDeleteId === pl.id ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={deletingId === pl.id}
                    onClick={() => handleConfirmDelete(pl.id)}
                    className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    {deletingId === pl.id ? '...' : 'Hapus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditPlaylist(pl)}
                    aria-label={`Edit playlist ${pl.name}`}
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(pl.id)}
                    aria-label={`Hapus playlist ${pl.name}`}
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
