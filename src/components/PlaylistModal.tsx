import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { CoverArt } from './CoverArt.tsx';
import type { CoverVariant, Playlist } from '../types/music.ts';

interface PlaylistModalProps {
  open: boolean;
  initialPlaylist?: Playlist | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string | null;
    moodTag: string | null;
    coverVariant: CoverVariant;
  }) => Promise<void>;
}

const COVER_OPTIONS: Array<{ value: CoverVariant; label: string }> = [
  { value: 'focus', label: 'Fokus Tenang' },
  { value: 'rain', label: 'Hujan & Senja' },
  { value: 'morning', label: 'Pagi Cerah' },
];

export function PlaylistModal({
  open,
  initialPlaylist,
  onClose,
  onSubmit,
}: PlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [coverVariant, setCoverVariant] = useState<CoverVariant>('focus');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialPlaylist) {
      setName(initialPlaylist.name);
      setDescription(initialPlaylist.description || '');
      setMoodTag(initialPlaylist.moodTag || '');
      setCoverVariant(initialPlaylist.coverVariant || 'focus');
    } else {
      setName('');
      setDescription('');
      setMoodTag('');
      setCoverVariant('focus');
    }
    setError(null);
  }, [open, initialPlaylist]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama playlist wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        moodTag: moodTag.trim() || null,
        coverVariant,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan playlist.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-modal-title"
    >
      <div className="w-full max-w-lg rounded-t-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2
            id="playlist-modal-title"
            className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50"
          >
            {initialPlaylist ? 'Edit Playlist' : 'Buat Playlist Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="playlist-name"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Nama Playlist
            </label>
            <input
              id="playlist-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Fokus Belajar Malam"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="playlist-mood"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Suasana / Aktivitas (Opsional)
            </label>
            <input
              id="playlist-mood"
              type="text"
              value={moodTag}
              onChange={(e) => setMoodTag(e.target.value)}
              placeholder="Contoh: Tenang & Fokus"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="playlist-desc"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              id="playlist-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Gambaran singkat tentang playlist ini..."
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Pilih Sampul Editorial
            </span>
            <div className="grid grid-cols-3 gap-3">
              {COVER_OPTIONS.map((opt) => {
                const selected = coverVariant === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCoverVariant(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-2 text-left transition-colors ${
                      selected
                        ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <CoverArt
                      variant={opt.value}
                      alt={opt.label}
                      className="w-full aspect-square rounded-lg"
                    />
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 text-center">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving
                ? 'Menyimpan...'
                : initialPlaylist
                  ? 'Simpan Perubahan'
                  : 'Buat Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
