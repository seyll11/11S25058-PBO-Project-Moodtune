import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { Song } from '../types/music.ts';

interface SongModalProps {
  open: boolean;
  initialSong?: Song | null;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    artist: string;
    genre: string;
    releaseYear: number;
    moodNote: string | null;
  }) => Promise<void>;
}

const GENRE_SUGGESTIONS = [
  'Pop',
  'Indie',
  'R&B',
  'Lo-Fi',
  'Jazz',
  'Rock',
  'Akustik',
  'Elektronik',
  'Klasik',
];

export function SongModal({
  open,
  initialSong,
  onClose,
  onSubmit,
}: SongModalProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('Indie');
  const [releaseYear, setReleaseYear] = useState(
    String(new Date().getFullYear())
  );
  const [moodNote, setMoodNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialSong) {
      setTitle(initialSong.title);
      setArtist(initialSong.artist);
      setGenre(initialSong.genre);
      setReleaseYear(String(initialSong.releaseYear));
      setMoodNote(initialSong.moodNote || '');
    } else {
      setTitle('');
      setArtist('');
      setGenre('Indie');
      setReleaseYear(String(new Date().getFullYear()));
      setMoodNote('');
    }
    setError(null);
  }, [open, initialSong]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !artist.trim() || !genre.trim()) {
      setError('Judul lagu, nama artis, dan genre wajib diisi.');
      return;
    }

    const year = Number(releaseYear);
    if (!Number.isInteger(year) || year < 1900 || year > 2030) {
      setError('Tahun rilis harus berupa angka antara 1900 sampai 2030.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        artist: artist.trim(),
        genre: genre.trim(),
        releaseYear: year,
        moodNote: moodNote.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan data lagu.'
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
      aria-labelledby="song-modal-title"
    >
      <div className="w-full max-w-lg rounded-t-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2
            id="song-modal-title"
            className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50"
          >
            {initialSong ? 'Edit Data Lagu' : 'Tambah Lagu ke Koleksi'}
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
              htmlFor="song-title"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Judul Lagu
            </label>
            <input
              id="song-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Ruang Sendiri"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="song-artist"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Artis / Musisi
            </label>
            <input
              id="song-artist"
              type="text"
              required
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Contoh: Tulus"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="song-genre"
                className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Genre
              </label>
              <input
                id="song-genre"
                type="text"
                list="genre-suggestions"
                required
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Indie Pop"
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
              />
              <datalist id="genre-suggestions">
                {GENRE_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="song-year"
                className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Tahun Rilis
              </label>
              <input
                id="song-year"
                type="number"
                min={1900}
                max={2030}
                required
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 font-mono tabular-nums text-sm text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="song-mood"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Catatan Suasana (Opsional)
            </label>
            <input
              id="song-mood"
              type="text"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="Misal: Cocok untuk fokus malam atau santai sore"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
            />
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
                : initialSong
                  ? 'Simpan Perubahan'
                  : 'Tambahkan Lagu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
