import React, { useState } from 'react';
import {
  AlertCircle,
  AudioLines,
  BookOpen,
  Check,
  ListPlus,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { CoverArt } from './CoverArt.tsx';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import type {
  CoverVariant,
  GeneratedPlaylistDraft,
  MoodRecommendationResponse,
  RecommendedTrack,
  Song,
} from '../types/music.ts';

interface AiStudioViewProps {
  songs: Song[];
  initialTab?: 'recommend' | 'generator';
  onSongSaved: (song: Song) => void;
  onAssignNewTrackToPlaylist: (track: RecommendedTrack) => Promise<void>;
  onExplainTheme: (track: { title: string; artist: string; genre?: string }) => void;
  onPlaylistGeneratedAndSaved: (playlistId: number) => void;
}

const MOOD_PRESETS = [
  'Mau fokus belajar',
  'Lagi sedih dan butuh teman',
  'Energik untuk lari pagi',
  'Santai sore hari hujan',
  'Lembur kerja tengah malam',
];

export function AiStudioView({
  songs,
  initialTab = 'recommend',
  onSongSaved,
  onAssignNewTrackToPlaylist,
  onExplainTheme,
  onPlaylistGeneratedAndSaved,
}: AiStudioViewProps) {
  const { playTrackYouTube, playSoundscape, isTrackPlaying } = useAudioPlayer();
  const [mode, setMode] = useState<'recommend' | 'generator'>(initialTab);

  // Recommender state
  const [moodInput, setMoodInput] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recResult, setRecResult] = useState<MoodRecommendationResponse | null>(
    null
  );
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Generator state
  const [themeInput, setThemeInput] = useState('');
  const [trackCount, setTrackCount] = useState(6);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratedPlaylistDraft | null>(null);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const trackKey = (t: RecommendedTrack) =>
    `${t.title.toLowerCase()}::${t.artist.toLowerCase()}`;

  const isAlreadyInLibrary = (t: RecommendedTrack) => {
    if (t.source === 'library' && t.songId) return true;
    const k = trackKey(t);
    if (savedKeys.includes(k)) return true;
    return songs.some(
      (s) =>
        s.title.toLowerCase() === t.title.toLowerCase() &&
        s.artist.toLowerCase() === t.artist.toLowerCase()
    );
  };

  const handleRunRecommend = async (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const targetMood = (preset ?? moodInput).trim();
    if (!targetMood) return;
    if (preset) setMoodInput(preset);

    setRecLoading(true);
    setRecError(null);
    try {
      const res = await api.recommendByMood(targetMood);
      setRecResult(res);
    } catch (err) {
      setRecError(
        err instanceof Error ? err.message : 'Gagal memuat rekomendasi mood.'
      );
    } finally {
      setRecLoading(false);
    }
  };

  const handleSaveSingleSong = async (track: RecommendedTrack) => {
    const key = trackKey(track);
    setSavingKey(key);
    try {
      const res = await api.createSong({
        title: track.title,
        artist: track.artist,
        genre: track.genre,
        releaseYear: track.releaseYear,
        moodNote: track.reason,
      });
      setSavedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      onSongSaved(res.song);
    } catch (err) {
      setRecError(
        err instanceof Error ? err.message : 'Gagal menyimpan lagu ke koleksi.'
      );
    } finally {
      setSavingKey(null);
    }
  };

  const handleRunGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeInput.trim()) return;
    setGenLoading(true);
    setGenError(null);
    try {
      const res = await api.generatePlaylist(themeInput.trim(), trackCount);
      setDraft(res.draft);
    } catch (err) {
      setGenError(
        err instanceof Error
          ? err.message
          : 'Gagal menyusun playlist otomatis.'
      );
    } finally {
      setGenLoading(false);
    }
  };

  const handleRemoveDraftTrack = (index: number) => {
    if (!draft) return;
    const next = [...draft.tracks];
    next.splice(index, 1);
    setDraft({ ...draft, tracks: next });
  };

  const handleSaveDraftPlaylist = async () => {
    if (!draft || draft.tracks.length === 0) return;
    setSavingPlaylist(true);
    setGenError(null);
    try {
      const res = await api.saveGeneratedPlaylist(draft);
      onPlaylistGeneratedAndSaved(res.playlist.id);
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : 'Gagal menyimpan playlist ke database.'
      );
    } finally {
      setSavingPlaylist(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setMode('recommend')}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            mode === 'recommend'
              ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
          }`}
        >
          AI Mood Recommender
        </button>
        <button
          type="button"
          onClick={() => setMode('generator')}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            mode === 'generator'
              ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
          }`}
        >
          AI Playlist Generator
        </button>
      </div>

      {mode === 'recommend' ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-zinc-50">
              Ceritakan suasana hati atau aktivitas Anda
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              AI akan memadukan lagu yang cocok dari koleksi pribadi Anda (
              <span className="font-mono tabular-nums">{songs.length}</span>{' '}
              lagu tersimpan) dengan rekomendasi baru yang relevan.
            </p>

            <form
              onSubmit={(e) => handleRunRecommend(e)}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                value={moodInput}
                onChange={(e) => setMoodInput(e.target.value)}
                placeholder="Misal: lagi sedih, mau fokus belajar, atau road trip senja..."
                className="flex-1 min-h-[46px] rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={recLoading || !moodInput.trim()}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                <span>{recLoading ? 'Mencari Lagu...' : 'Sarankan Lagu'}</span>
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1">
                Contoh cepat:
              </span>
              {MOOD_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRunRecommend(undefined, preset)}
                  className="min-h-[34px] rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {recError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{recError}</span>
              </div>
              {moodInput.trim() && (
                <button
                  type="button"
                  onClick={() => handleRunRecommend()}
                  disabled={recLoading}
                  className="min-h-[36px] rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900/60 shrink-0"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          )}

          {recLoading && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4 animate-pulse">
              <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800/70" />
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/60"
                />
              ))}
            </div>
          )}

          {recResult && !recLoading && (
            <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Kurasi Suasana · {recResult.moodSummary}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {recResult.curationNote}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void playSoundscape({
                      moodOrPrompt: moodInput.trim() || recResult.moodSummary,
                    })
                  }
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <AudioLines className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Putar AI Mood Soundscape</span>
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recResult.recommendations.map((track, idx) => {
                  const key = trackKey(track);
                  const saved = isAlreadyInLibrary(track);
                  const isBusy = savingKey === key;
                  return (
                    <div
                      key={`${key}-${idx}`}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                            {track.title}
                          </h3>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {track.source === 'library'
                              ? 'Dari Koleksi Anda'
                              : 'Saran Lagu Baru'}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{track.artist}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{track.genre}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            {track.releaseYear}
                          </span>
                        </p>

                        <p className="text-sm text-zinc-600 dark:text-zinc-300 pt-0.5">
                          {track.reason}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            void playTrackYouTube(
                              {
                                title: track.title,
                                artist: track.artist,
                                genre: track.genre,
                              },
                              recResult.recommendations.map((r) => ({
                                title: r.title,
                                artist: r.artist,
                                genre: r.genre,
                              }))
                            )
                          }
                          title="Putar lagu penuh via YouTube"
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
                        >
                          {isTrackPlaying(track.title, track.artist) ? (
                            <>
                              <Pause className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Jeda</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Dengar</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onExplainTheme(track)}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Tema</span>
                        </button>

                        {saved ? (
                          <span className="inline-flex min-h-[40px] items-center gap-1 px-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            <Check className="h-3.5 w-3.5" />
                            <span>Di Koleksi</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSaveSingleSong(track)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{isBusy ? 'Menyimpan...' : 'Simpan Lagu'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onAssignNewTrackToPlaylist(track)}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
                        >
                          <ListPlus className="h-3.5 w-3.5" />
                          <span>Ke Playlist</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* AI Playlist Generator */
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-zinc-50">
              Buat Playlist Otomatis Berdasarkan Tema
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Tentukan tema atau momen. AI merangkai playlist lengkap dari
              koleksi pribadi dan penemuan lagu baru yang siap Anda simpan ke
              PostgreSQL.
            </p>

            <form
              onSubmit={handleRunGenerator}
              className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12"
            >
              <input
                type="text"
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                placeholder="Misal: Malam produktif menulis kode, atau Kopi pagi santai..."
                className="sm:col-span-7 min-h-[46px] rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />

              <select
                aria-label="Jumlah lagu"
                value={trackCount}
                onChange={(e) => setTrackCount(Number(e.target.value))}
                className="sm:col-span-2 min-h-[46px] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value={4}>4 Lagu</option>
                <option value={6}>6 Lagu</option>
                <option value={8}>8 Lagu</option>
                <option value={10}>10 Lagu</option>
              </select>

              <button
                type="submit"
                disabled={genLoading || !themeInput.trim()}
                className="sm:col-span-3 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                <span>{genLoading ? 'Menyusun...' : 'Buat Playlist'}</span>
              </button>
            </form>
          </div>

          {genError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
              {themeInput.trim() && (
                <button
                  type="button"
                  onClick={(e) => handleRunGenerator(e as unknown as React.FormEvent)}
                  disabled={genLoading}
                  className="min-h-[36px] rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900/60 shrink-0"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          )}

          {genLoading && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4 animate-pulse">
              <div className="flex gap-4">
                <div className="h-28 w-28 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800/70" />
                </div>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800/60"
                />
              ))}
            </div>
          )}

          {draft && !genLoading && (
            <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
              <div className="flex flex-col gap-5 border-b border-zinc-200 p-6 dark:border-zinc-800 sm:flex-row sm:items-start">
                <div className="w-28 h-28 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <CoverArt
                    variant={draft.coverVariant}
                    alt={draft.name}
                    className="h-full w-full"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Judul Playlist (dapat diubah)
                      </label>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-display text-base font-bold text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Suasana &amp; Sampul
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={draft.moodTag}
                          onChange={(e) =>
                            setDraft({ ...draft, moodTag: e.target.value })
                          }
                          className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                        />
                        <select
                          aria-label="Pilih sampul"
                          value={draft.coverVariant}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              coverVariant: e.target.value as CoverVariant,
                            })
                          }
                          className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        >
                          <option value="focus">Fokus</option>
                          <option value="rain">Hujan</option>
                          <option value="morning">Pagi</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Deskripsi
                    </label>
                    <input
                      type="text"
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {draft.tracks.map((track, idx) => (
                  <div
                    key={`${track.title}-${idx}`}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <span className="font-mono text-xs text-zinc-400 tabular-nums mt-1">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="font-medium text-zinc-950 dark:text-zinc-50">
                            {track.title}
                          </p>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {track.source === 'library'
                              ? 'Dari Koleksi'
                              : 'Lagu Baru (akan disimpan)'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {track.artist} · {track.genre} ·{' '}
                          <span className="font-mono tabular-nums">
                            {track.releaseYear}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {track.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          void playTrackYouTube(
                            {
                              title: track.title,
                              artist: track.artist,
                              genre: track.genre,
                            },
                            draft.tracks.map((t) => ({
                              title: t.title,
                              artist: t.artist,
                              genre: t.genre,
                            }))
                          )
                        }
                        title="Putar lagu penuh via YouTube"
                        aria-label={`Dengar ${track.title} via YouTube`}
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {isTrackPlaying(track.title, track.artist) ? (
                          <Pause className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onExplainTheme(track)}
                        aria-label="Jelaskan tema lagu"
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftTrack(idx)}
                        aria-label="Hapus lagu dari pratinjau"
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {draft.tracks.length} lagu siap disimpan
                </p>
                <button
                  type="button"
                  disabled={
                    savingPlaylist ||
                    !draft.name.trim() ||
                    draft.tracks.length === 0
                  }
                  onClick={handleSaveDraftPlaylist}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {savingPlaylist
                      ? 'Menyimpan Playlist...'
                      : 'Simpan Playlist ke Koleksi'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
