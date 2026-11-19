import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { CoverArt } from './CoverArt.tsx';
import type { Playlist, PlaylistDetail, Song } from '../types/music.ts';

interface PlaylistDetailViewProps {
  playlistId: number;
  allSongs: Song[];
  onBack: () => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onExplainTheme: (song: { title: string; artist: string; genre?: string }) => void;
  onPlaylistUpdated: () => void;
}

export function PlaylistDetailView({
  playlistId,
  allSongs,
  onBack,
  onEditPlaylist,
  onExplainTheme,
  onPlaylistUpdated,
}: PlaylistDetailViewProps) {
  const [detail, setDetail] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [busyTrackId, setBusyTrackId] = useState<number | null>(null);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPlaylistDetail(playlistId);
      setDetail(res.playlist);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat detail playlist.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [playlistId]);

  const availableSongs = useMemo(() => {
    if (!detail) return allSongs;
    const inPlaylist = new Set(detail.tracks.map((t) => t.id));
    return allSongs.filter((s) => !inPlaylist.has(s.id));
  }, [allSongs, detail]);

  const handleTogglePick = (songId: number) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    );
  };

  const handleAddSelected = async () => {
    if (selectedSongIds.length === 0) return;
    setAdding(true);
    try {
      const res = await api.addTracksToPlaylist(playlistId, selectedSongIds);
      setDetail(res.playlist);
      setSelectedSongIds([]);
      setPickerOpen(false);
      onPlaylistUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menambahkan lagu.'
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveTrack = async (songId: number) => {
    setBusyTrackId(songId);
    try {
      const res = await api.removeTrackFromPlaylist(playlistId, songId);
      setDetail(res.playlist);
      onPlaylistUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal mengeluarkan lagu.'
      );
    } finally {
      setBusyTrackId(null);
    }
  };

  const handleMoveTrack = async (index: number, direction: -1 | 1) => {
    if (!detail) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= detail.tracks.length) return;

    const reordered = [...detail.tracks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setDetail({ ...detail, tracks: reordered });
    try {
      const res = await api.reorderPlaylistTracks(
        playlistId,
        reordered.map((t) => t.id)
      );
      setDetail(res.playlist);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal mengubah urutan lagu.'
      );
      loadDetail();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-44 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Playlist</span>
        </button>
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Semua Playlist</span>
      </button>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Playlist Header */}
      <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end">
        <div className="w-36 h-36 sm:w-44 sm:h-44 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <CoverArt
            variant={detail.coverVariant}
            alt={detail.name}
            className="h-full w-full"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Playlist</span>
            {detail.moodTag && (
              <>
                <span aria-hidden="true"> · </span>
                <span>{detail.moodTag}</span>
              </>
            )}
            <span aria-hidden="true"> · </span>
            <span className="font-mono tabular-nums">
              {detail.tracks.length} lagu
            </span>
          </p>

          <h2 className="font-display text-2xl font-bold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
            {detail.name}
          </h2>

          {detail.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {detail.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSongIds([]);
                setPickerOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Lagu dari Koleksi</span>
            </button>
            <button
              type="button"
              onClick={() => onEditPlaylist(detail)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit Detail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      {detail.tracks.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Playlist ini belum memiliki lagu.
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Tambahkan lagu dari koleksi pribadi Anda untuk mulai menyusun urutan.
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Pilih Lagu</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {detail.tracks.map((track, idx) => (
            <div
              key={track.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-xs text-zinc-400 tabular-nums w-6 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-zinc-950 dark:text-zinc-50 truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{track.artist}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{track.genre}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono tabular-nums">
                      {track.releaseYear}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveTrack(idx, -1)}
                  aria-label="Naikkan urutan lagu"
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === detail.tracks.length - 1}
                  onClick={() => handleMoveTrack(idx, 1)}
                  aria-label="Turunkan urutan lagu"
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onExplainTheme(track)}
                  aria-label="Jelaskan tema lagu"
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={busyTrackId === track.id}
                  onClick={() => handleRemoveTrack(track.id)}
                  aria-label="Keluarkan lagu dari playlist"
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-select Song Picker Modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex w-full max-w-lg flex-col rounded-t-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl max-h-[85vh]">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  Pilih Lagu dari Koleksi
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Pilih satu atau lebih lagu untuk ditambahkan ke {detail.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Tutup"
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {availableSongs.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Semua lagu di koleksi Anda sudah masuk dalam playlist ini.
                </p>
              ) : (
                availableSongs.map((song) => {
                  const checked = selectedSongIds.includes(song.id);
                  return (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => handleTogglePick(song.id)}
                      className="flex w-full min-h-[54px] items-center justify-between gap-3 py-2.5 px-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {song.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {song.artist} · {song.genre} ·{' '}
                          <span className="font-mono tabular-nums">
                            {song.releaseYear}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          checked
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        {checked && <Check className="h-4 w-4" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {selectedSongIds.length} dipilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="min-h-[42px] rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={adding || selectedSongIds.length === 0}
                  onClick={handleAddSelected}
                  className="min-h-[42px] rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {adding ? 'Menambahkan...' : 'Tambahkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
