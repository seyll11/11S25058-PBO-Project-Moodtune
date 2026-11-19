import { useMemo, useState } from 'react';
import {
  AudioLines,
  BookOpen,
  ListPlus,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { CoverArt } from './CoverArt.tsx';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import type { Song } from '../types/music.ts';

interface SongsViewProps {
  songs: Song[];
  loading: boolean;
  onAddSong: () => void;
  onEditSong: (song: Song) => void;
  onDeleteSong: (songId: number) => Promise<void>;
  onAssignPlaylist: (song: Song) => void;
  onExplainTheme: (song: Song) => void;
  onOpenAiStudio: () => void;
}

export function SongsView({
  songs,
  loading,
  onAddSong,
  onEditSong,
  onDeleteSong,
  onAssignPlaylist,
  onExplainTheme,
  onOpenAiStudio,
}: SongsViewProps) {
  const {
    playTrackYouTube,
    playSoundscape,
    isTrackPlaying,
    isTrackSelected,
  } = useAudioPlayer();
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'newest' | 'year_desc' | 'title_asc'>(
    'newest'
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const genres = useMemo(() => {
    const unique = Array.from(new Set(songs.map((s) => s.genre))).sort();
    return ['Semua', ...unique];
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = songs.filter((s) => {
      const matchesGenre =
        selectedGenre === 'Semua' || s.genre === selectedGenre;
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        String(s.releaseYear).includes(q);
      return matchesGenre && matchesQuery;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'year_desc') return b.releaseYear - a.releaseYear;
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      return b.id - a.id;
    });
  }, [songs, query, selectedGenre, sortBy]);

  const handleConfirmDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDeleteSong(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full max-w-md rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 px-5 flex items-center justify-between">
              <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
        <div className="mx-auto h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <CoverArt
            variant="focus"
            alt="Ilustrasi koleksi lagu kosong"
            className="h-full w-full"
          />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-zinc-950 dark:text-zinc-50">
          Koleksi lagu Anda masih kosong
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Mulai catat lagu favorit Anda lengkap dengan artis, genre, dan tahun
          rilis, atau minta AI Studio mencarikan rekomendasi lagu sesuai suasana
          hati Anda.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAddSong}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Lagu Pertama</span>
          </button>
          <button
            type="button"
            onClick={onOpenAiStudio}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap"
          >
            <Music className="h-4 w-4" />
            <span>Cari Rekomendasi di AI Studio</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul lagu, artis, genre, atau tahun..."
            className="w-full min-h-[44px] rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            {genres.slice(0, 6).map((genre) => {
              const active = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>

          <select
            aria-label="Urutkan lagu"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'newest' | 'year_desc' | 'title_asc')
            }
            className="min-h-[42px] rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="newest">Terbaru Ditambahkan</option>
            <option value="year_desc">Tahun Rilis Terbaru</option>
            <option value="title_asc">Judul A–Z</option>
          </select>
        </div>
      </div>

      {/* Summary line (unboxed metadata) */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <p className="font-mono tabular-nums">
          Menampilkan {filteredSongs.length} dari {songs.length} lagu
        </p>
      </div>

      {filteredSongs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Tidak ada lagu yang cocok dengan pencarian Anda.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedGenre('Semua');
            }}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Reset filter pencarian
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <th className="py-3 pl-5 pr-3 w-12 font-mono">#</th>
                  <th className="py-3 px-3">Judul &amp; Catatan</th>
                  <th className="py-3 px-3">Artis</th>
                  <th className="py-3 px-3">Genre</th>
                  <th className="py-3 px-3 text-right">Tahun</th>
                  <th className="py-3 pl-3 pr-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm">
                {filteredSongs.map((song, idx) => {
                  const playing = isTrackPlaying(song.title, song.artist);
                  const selected = isTrackSelected(song.title, song.artist);
                  return (
                    <tr
                      key={song.id}
                      className="group hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 pl-5 pr-3 font-mono text-xs text-zinc-400 tabular-nums">
                        <button
                          type="button"
                          onClick={() =>
                            void playTrackYouTube(
                              {
                                title: song.title,
                                artist: song.artist,
                                genre: song.genre,
                              },
                              filteredSongs.map((s) => ({
                                title: s.title,
                                artist: s.artist,
                                genre: s.genre,
                              }))
                            )
                          }
                          title="Putar lagu penuh via YouTube"
                          aria-label={playing ? `Jeda ${song.title}` : `Putar ${song.title}`}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
                          }`}
                        >
                          {playing ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5 ml-0.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-zinc-950 dark:text-zinc-50">
                          {song.title}
                        </p>
                        {song.moodNote && (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {song.moodNote}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                        {song.artist}
                      </td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                        {song.genre}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                        {song.releaseYear}
                      </td>
                      <td className="py-3 pl-3 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          {confirmDeleteId === song.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={deletingId === song.id}
                                onClick={() => handleConfirmDelete(song.id)}
                                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                              >
                                {deletingId === song.id ? 'Menghapus...' : 'Hapus'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void playSoundscape({
                                    moodOrPrompt: `${song.title} oleh ${song.artist} (${song.genre})`,
                                    title: song.title,
                                    artist: song.artist,
                                    genre: song.genre,
                                  })
                                }
                                title="Putar AI Mood Soundscape"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400 transition-colors"
                              >
                                <AudioLines className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onExplainTheme(song)}
                                title="Jelaskan Tema Lagu"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400 transition-colors"
                              >
                                <BookOpen className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onAssignPlaylist(song)}
                                title="Masukkan ke Playlist"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
                              >
                                <ListPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditSong(song)}
                                title="Edit Lagu"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(song.id)}
                                title="Hapus Lagu"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Ergonomic Touch List */}
          <div className="md:hidden divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {filteredSongs.map((song) => (
              <div key={song.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-zinc-950 dark:text-zinc-50 truncate">
                      {song.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{song.artist}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{song.genre}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">
                        {song.releaseYear}
                      </span>
                    </p>
                  </div>
                </div>

                {song.moodNote && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {song.moodNote}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        void playTrackYouTube(
                          {
                            title: song.title,
                            artist: song.artist,
                            genre: song.genre,
                          },
                          filteredSongs.map((s) => ({
                            title: s.title,
                            artist: s.artist,
                            genre: s.genre,
                          }))
                        )
                      }
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      {isTrackPlaying(song.title, song.artist) ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          <span>Jeda</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Putar</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void playSoundscape({
                          moodOrPrompt: `${song.title} oleh ${song.artist} (${song.genre})`,
                          title: song.title,
                          artist: song.artist,
                          genre: song.genre,
                        })
                      }
                      aria-label="Putar AI Soundscape"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                    >
                      <AudioLines className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExplainTheme(song)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Tema</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {confirmDeleteId === song.id ? (
                      <>
                        <button
                          type="button"
                          disabled={deletingId === song.id}
                          onClick={() => handleConfirmDelete(song.id)}
                          className="min-h-[44px] rounded-xl bg-red-600 px-3 text-xs font-medium text-white"
                        >
                          {deletingId === song.id ? '...' : 'Hapus'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] rounded-xl border border-zinc-200 px-3 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onAssignPlaylist(song)}
                          aria-label="Masukkan ke playlist"
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <ListPlus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditSong(song)}
                          aria-label="Edit lagu"
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(song.id)}
                          aria-label="Hapus lagu"
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
