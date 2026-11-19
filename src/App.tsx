import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Disc3,
  ListMusic,
  LogOut,
  Moon,
  Music2,
  Plus,
  Sparkles,
  Sun,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AudioPlayerProvider } from './context/AudioPlayerContext.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { SongsView } from './components/SongsView.tsx';
import { PlaylistsView } from './components/PlaylistsView.tsx';
import { PlaylistDetailView } from './components/PlaylistDetailView.tsx';
import { AiStudioView } from './components/AiStudioView.tsx';
import { ThemeExplainerView } from './components/ThemeExplainerView.tsx';
import { SongModal } from './components/SongModal.tsx';
import { PlaylistModal } from './components/PlaylistModal.tsx';
import { AddToPlaylistModal } from './components/AddToPlaylistModal.tsx';
import { ThemeExplainerDrawer } from './components/ThemeExplainerDrawer.tsx';
import { AudioPlayerBar } from './components/AudioPlayerBar.tsx';
import { api } from './lib/api.ts';
import type {
  CoverVariant,
  Playlist,
  RecommendedTrack,
  Song,
} from './types/music.ts';

type WorkspaceTab = 'songs' | 'playlists' | 'ai' | 'theme';

function MoodTuneAppShell({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const { firebaseUser, profile, loading: authLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('songs');
  const [aiInitialMode, setAiInitialMode] = useState<'recommend' | 'generator'>(
    'recommend'
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null
  );

  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modals & Drawers
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const [assignTargetSong, setAssignTargetSong] = useState<{
    songId: number | null;
    title: string;
    artist: string;
    genre: string;
    releaseYear: number;
    reason?: string;
  } | null>(null);

  const [explainerTarget, setExplainerTarget] = useState<{
    title: string;
    artist: string;
    genre?: string;
  } | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((curr) => (curr === message ? null : curr));
    }, 3200);
  }, []);

  const loadLibraryData = useCallback(async () => {
    if (!firebaseUser) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const [songsRes, playlistsRes] = await Promise.all([
        api.listSongs(),
        api.listPlaylists(),
      ]);
      setSongs(songsRes.songs);
      setPlaylists(playlistsRes.playlists);
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat koleksi lagu dan playlist.'
      );
    } finally {
      setDataLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      loadLibraryData();
    } else {
      setSongs([]);
      setPlaylists([]);
      setSelectedPlaylistId(null);
    }
  }, [firebaseUser, loadLibraryData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Disc3 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Menyiapkan studio MoodTune...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthGate isDark={isDark} onToggleTheme={onToggleTheme} />;
  }

  // Handlers for Song CRUD
  const handleSaveSong = async (payload: {
    title: string;
    artist: string;
    genre: string;
    releaseYear: number;
    moodNote: string | null;
  }) => {
    if (editingSong) {
      const res = await api.updateSong(editingSong.id, payload);
      setSongs((prev) =>
        prev.map((s) => (s.id === editingSong.id ? res.song : s))
      );
      showToast(`"${res.song.title}" berhasil diperbarui.`);
    } else {
      const res = await api.createSong(payload);
      setSongs((prev) => [res.song, ...prev]);
      showToast(`"${res.song.title}" ditambahkan ke koleksi.`);
    }
  };

  const handleDeleteSong = async (songId: number) => {
    await api.deleteSong(songId);
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    const plRes = await api.listPlaylists();
    setPlaylists(plRes.playlists);
    showToast('Lagu dihapus dari koleksi.');
  };

  // Handlers for Playlist CRUD
  const handleSavePlaylist = async (payload: {
    name: string;
    description: string | null;
    moodTag: string | null;
    coverVariant: CoverVariant;
  }) => {
    if (editingPlaylist) {
      const res = await api.updatePlaylist(editingPlaylist.id, payload);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === editingPlaylist.id ? res.playlist : p))
      );
      showToast(`Playlist "${res.playlist.name}" diperbarui.`);
    } else {
      const res = await api.createPlaylist(payload);
      setPlaylists((prev) => [res.playlist, ...prev]);
      showToast(`Playlist "${res.playlist.name}" dibuat.`);
    }
  };

  const handleDeletePlaylist = async (playlistId: number) => {
    await api.deletePlaylist(playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
    showToast('Playlist dihapus.');
  };

  // Resolve song ID (saving AI new song first if needed) then assign to playlist
  const resolveTargetSongId = async () => {
    if (!assignTargetSong) throw new Error('Tidak ada lagu yang dipilih.');
    if (assignTargetSong.songId) return assignTargetSong.songId;

    const existing = songs.find(
      (s) =>
        s.title.toLowerCase() === assignTargetSong.title.toLowerCase() &&
        s.artist.toLowerCase() === assignTargetSong.artist.toLowerCase()
    );
    if (existing) return existing.id;

    const created = await api.createSong({
      title: assignTargetSong.title,
      artist: assignTargetSong.artist,
      genre: assignTargetSong.genre,
      releaseYear: assignTargetSong.releaseYear,
      moodNote: assignTargetSong.reason || null,
    });
    setSongs((prev) => [created.song, ...prev]);
    return created.song.id;
  };

  const handleAssignToPlaylist = async (playlistId: number) => {
    const songId = await resolveTargetSongId();
    await api.addTracksToPlaylist(playlistId, [songId]);
    const plRes = await api.listPlaylists();
    setPlaylists(plRes.playlists);
    showToast('Lagu ditambahkan ke playlist.');
  };

  const handleCreatePlaylistAndAssign = async (name: string) => {
    const songId = await resolveTargetSongId();
    const createdPl = await api.createPlaylist({ name });
    await api.addTracksToPlaylist(createdPl.playlist.id, [songId]);
    const plRes = await api.listPlaylists();
    setPlaylists(plRes.playlists);
    showToast(`Playlist "${name}" dibuat dengan lagu ini.`);
  };

  const handleAssignAiTrack = async (track: RecommendedTrack) => {
    setAssignTargetSong({
      songId: track.songId,
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      releaseYear: track.releaseYear,
      reason: track.reason,
    });
  };

  const handlePlaylistGeneratedAndSaved = async (newPlaylistId: number) => {
    await loadLibraryData();
    setActiveTab('playlists');
    setSelectedPlaylistId(newPlaylistId);
    showToast('Playlist otomatis berhasil disimpan ke koleksi.');
  };

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    shortLabel: string;
    icon: typeof Music2;
  }> = [
    { id: 'songs', label: 'Koleksi Lagu', shortLabel: 'Koleksi', icon: Music2 },
    { id: 'playlists', label: 'Playlist', shortLabel: 'Playlist', icon: ListMusic },
    { id: 'ai', label: 'AI Studio', shortLabel: 'AI Mood', icon: Sparkles },
    { id: 'theme', label: 'Penjelas Tema', shortLabel: 'Tema', icon: BookOpen },
  ];

  const pageTitle =
    activeTab === 'songs'
      ? 'Koleksi Lagu'
      : activeTab === 'playlists'
        ? selectedPlaylistId
          ? 'Detail Playlist'
          : 'Playlist'
        : activeTab === 'ai'
          ? 'AI Mood & Generator'
          : 'Penjelas Tema Lagu';

  const displayName =
    profile?.displayName ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'Pengguna';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <span className="font-display text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap">
            MoodTune
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== 'playlists') setSelectedPlaylistId(null);
                }}
                className={`flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 space-y-3">
          <div className="px-2">
            <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
              {displayName}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {firebaseUser.email}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full min-h-[40px] items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar (Desktop & Mobile Compact) */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="mx-auto flex h-[52px] lg:h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-display text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50 lg:hidden whitespace-nowrap">
                MoodTune
              </span>
              <span className="text-zinc-300 dark:text-zinc-700 lg:hidden">/</span>
              <h1 className="font-display text-sm sm:text-base lg:text-lg font-bold text-zinc-950 dark:text-zinc-50 truncate">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={signOut}
                aria-label="Keluar akun"
                className="lg:hidden inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {activeTab === 'playlists' && !selectedPlaylistId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlaylist(null);
                    setPlaylistModalOpen(true);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Playlist Baru</span>
                  <span className="sm:hidden">Playlist</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSong(null);
                    setSongModalOpen(true);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Tambah Lagu</span>
                  <span className="sm:hidden">Lagu</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-24">
          <AudioPlayerBar />
          {dataError && (
            <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Terjadi kendala memuat data</p>
                  <p className="mt-0.5">{dataError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadLibraryData}
                className="text-xs font-semibold underline hover:no-underline shrink-0"
              >
                Muat Ulang
              </button>
            </div>
          )}

          {activeTab === 'songs' && (
            <SongsView
              songs={songs}
              loading={dataLoading}
              onAddSong={() => {
                setEditingSong(null);
                setSongModalOpen(true);
              }}
              onEditSong={(song) => {
                setEditingSong(song);
                setSongModalOpen(true);
              }}
              onDeleteSong={handleDeleteSong}
              onAssignPlaylist={(song) =>
                setAssignTargetSong({
                  songId: song.id,
                  title: song.title,
                  artist: song.artist,
                  genre: song.genre,
                  releaseYear: song.releaseYear,
                })
              }
              onExplainTheme={(song) =>
                setExplainerTarget({
                  title: song.title,
                  artist: song.artist,
                  genre: song.genre,
                })
              }
              onOpenAiStudio={() => {
                setAiInitialMode('recommend');
                setActiveTab('ai');
              }}
            />
          )}

          {activeTab === 'playlists' &&
            (selectedPlaylistId !== null ? (
              <PlaylistDetailView
                playlistId={selectedPlaylistId}
                allSongs={songs}
                onBack={() => setSelectedPlaylistId(null)}
                onEditPlaylist={(pl) => {
                  setEditingPlaylist(pl);
                  setPlaylistModalOpen(true);
                }}
                onExplainTheme={(track) => setExplainerTarget(track)}
                onPlaylistUpdated={loadLibraryData}
              />
            ) : (
              <PlaylistsView
                playlists={playlists}
                loading={dataLoading}
                onCreatePlaylist={() => {
                  setEditingPlaylist(null);
                  setPlaylistModalOpen(true);
                }}
                onEditPlaylist={(pl) => {
                  setEditingPlaylist(pl);
                  setPlaylistModalOpen(true);
                }}
                onDeletePlaylist={handleDeletePlaylist}
                onSelectPlaylist={(id) => setSelectedPlaylistId(id)}
                onOpenAiGenerator={() => {
                  setAiInitialMode('generator');
                  setActiveTab('ai');
                }}
              />
            ))}

          {activeTab === 'ai' && (
            <AiStudioView
              key={aiInitialMode}
              songs={songs}
              initialTab={aiInitialMode}
              onSongSaved={(newSong) => {
                setSongs((prev) => [newSong, ...prev]);
                showToast(`"${newSong.title}" disimpan ke koleksi.`);
              }}
              onAssignNewTrackToPlaylist={handleAssignAiTrack}
              onExplainTheme={(track) => setExplainerTarget(track)}
              onPlaylistGeneratedAndSaved={handlePlaylistGeneratedAndSaved}
            />
          )}

          {activeTab === 'theme' && <ThemeExplainerView songs={songs} />}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi mobile"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-4 border-t border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                if (item.id !== 'playlists') setSelectedPlaylistId(null);
              }}
              className={`flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals & Drawers */}
      <SongModal
        open={songModalOpen}
        initialSong={editingSong}
        onClose={() => {
          setSongModalOpen(false);
          setEditingSong(null);
        }}
        onSubmit={handleSaveSong}
      />

      <PlaylistModal
        open={playlistModalOpen}
        initialPlaylist={editingPlaylist}
        onClose={() => {
          setPlaylistModalOpen(false);
          setEditingPlaylist(null);
        }}
        onSubmit={handleSavePlaylist}
      />

      <AddToPlaylistModal
        open={assignTargetSong !== null}
        songTitle={assignTargetSong?.title || ''}
        songArtist={assignTargetSong?.artist || ''}
        playlists={playlists}
        onClose={() => setAssignTargetSong(null)}
        onAssignToPlaylist={handleAssignToPlaylist}
        onCreatePlaylistAndAssign={handleCreatePlaylistAndAssign}
      />

      <ThemeExplainerDrawer
        target={explainerTarget}
        onClose={() => setExplainerTarget(null)}
      />

      {/* Non-intrusive Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-950 px-4 py-3 text-sm font-medium text-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800 lg:bottom-auto lg:top-20 lg:right-6"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="ml-1 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('moodtune-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      window.localStorage.setItem('moodtune-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <MoodTuneAppShell isDark={isDark} onToggleTheme={toggleTheme} />
      </AudioPlayerProvider>
    </AuthProvider>
  );
}
