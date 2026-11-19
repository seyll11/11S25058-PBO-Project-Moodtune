import React, { useState } from 'react';
import { Check, Plus, X, AlertCircle } from 'lucide-react';
import { CoverArt } from './CoverArt.tsx';
import type { Playlist } from '../types/music.ts';

interface AddToPlaylistModalProps {
  open: boolean;
  songTitle: string;
  songArtist: string;
  playlists: Playlist[];
  onClose: () => void;
  onAssignToPlaylist: (playlistId: number) => Promise<void>;
  onCreatePlaylistAndAssign: (name: string) => Promise<void>;
}

export function AddToPlaylistModal({
  open,
  songTitle,
  songArtist,
  playlists,
  onClose,
  onAssignToPlaylist,
  onCreatePlaylistAndAssign,
}: AddToPlaylistModalProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSelect = async (playlistId: number) => {
    setError(null);
    setBusyId(playlistId);
    try {
      await onAssignToPlaylist(playlistId);
      setAddedIds((prev) =>
        prev.includes(playlistId) ? prev : [...prev, playlistId]
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menambahkan lagu ke playlist.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setCreating(true);
    try {
      await onCreatePlaylistAndAssign(newName.trim());
      setNewName('');
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal membuat playlist baru.'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-playlist-title"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl max-h-[88vh] flex flex-col">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />

        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="assign-playlist-title"
              className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50"
            >
              Masukkan ke Playlist
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              {songTitle} · {songArtist}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {playlists.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Belum ada playlist. Buat playlist pertama Anda di bawah ini.
            </p>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedIds.includes(pl.id);
              const isBusy = busyId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSelect(pl.id)}
                  className="flex w-full min-h-[56px] items-center justify-between gap-3 py-2.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CoverArt
                      variant={pl.coverVariant}
                      alt={pl.name}
                      className="h-10 w-10 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                        {pl.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                        {pl.trackCount} lagu
                        {pl.moodTag ? ` · ${pl.moodTag}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                    {isBusy ? (
                      'Menambahkan...'
                    ) : isAdded ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4" /> Ditambahkan
                      </span>
                    ) : (
                      'Pilih'
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleQuickCreate}
          className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Buat playlist baru langsung..."
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{creating ? 'Membuat...' : 'Buat'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
