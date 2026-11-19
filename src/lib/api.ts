import { auth } from './firebase.ts';
import type {
  AudioPreviewResult,
  CoverVariant,
  GeneratedPlaylistDraft,
  LyricsThemeExplanation,
  MoodJournalEntry,
  MoodRecommendationResponse,
  MusicInsightsSummary,
  Playlist,
  PlaylistDetail,
  RecommendedTrack,
  Song,
  SoundscapeBlueprint,
  UserProfile,
  YouTubeSearchResult,
} from '../types/music.ts';

async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sesi pengguna tidak aktif. Silakan masuk kembali.');
  }
  const token = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : `Permintaan gagal (${res.status}).`
    );
  }
  return data as T;
}

export const api = {
  getMe: () => authFetch<{ user: UserProfile }>('/api/me'),

  listSongs: () => authFetch<{ songs: Song[] }>('/api/songs'),
  createSong: (payload: {
    title: string;
    artist: string;
    genre: string;
    releaseYear: number;
    moodNote?: string | null;
  }) =>
    authFetch<{ song: Song }>('/api/songs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSong: (
    id: number,
    payload: Partial<{
      title: string;
      artist: string;
      genre: string;
      releaseYear: number;
      moodNote: string | null;
    }>
  ) =>
    authFetch<{ song: Song }>(`/api/songs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteSong: (id: number) =>
    authFetch<{ success: boolean }>(`/api/songs/${id}`, {
      method: 'DELETE',
    }),

  listPlaylists: () => authFetch<{ playlists: Playlist[] }>('/api/playlists'),
  getPlaylistDetail: (id: number) =>
    authFetch<{ playlist: PlaylistDetail }>(`/api/playlists/${id}`),
  createPlaylist: (payload: {
    name: string;
    description?: string | null;
    moodTag?: string | null;
    coverVariant?: CoverVariant;
  }) =>
    authFetch<{ playlist: Playlist }>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePlaylist: (
    id: number,
    payload: Partial<{
      name: string;
      description: string | null;
      moodTag: string | null;
      coverVariant: CoverVariant;
    }>
  ) =>
    authFetch<{ playlist: PlaylistDetail }>(`/api/playlists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deletePlaylist: (id: number) =>
    authFetch<{ success: boolean }>(`/api/playlists/${id}`, {
      method: 'DELETE',
    }),

  addTracksToPlaylist: (playlistId: number, songIds: number[]) =>
    authFetch<{ playlist: PlaylistDetail }>(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ songIds }),
    }),
  removeTrackFromPlaylist: (playlistId: number, songId: number) =>
    authFetch<{ playlist: PlaylistDetail }>(
      `/api/playlists/${playlistId}/tracks/${songId}`,
      { method: 'DELETE' }
    ),
  reorderPlaylistTracks: (playlistId: number, songIds: number[]) =>
    authFetch<{ playlist: PlaylistDetail }>(
      `/api/playlists/${playlistId}/tracks/reorder`,
      {
        method: 'PATCH',
        body: JSON.stringify({ songIds }),
      }
    ),

  recommendByMood: (mood: string) =>
    authFetch<MoodRecommendationResponse>('/api/ai/recommend', {
      method: 'POST',
      body: JSON.stringify({ mood }),
    }),
  generatePlaylist: (theme: string, trackCount: number) =>
    authFetch<{ draft: GeneratedPlaylistDraft }>('/api/ai/generate-playlist', {
      method: 'POST',
      body: JSON.stringify({ theme, trackCount }),
    }),
  saveGeneratedPlaylist: (draft: {
    name: string;
    description: string;
    moodTag: string;
    coverVariant: CoverVariant;
    tracks: RecommendedTrack[];
  }) =>
    authFetch<{ playlist: PlaylistDetail }>('/api/ai/save-generated-playlist', {
      method: 'POST',
      body: JSON.stringify(draft),
    }),
  explainLyricsTheme: (payload: {
    title: string;
    artist: string;
    genre?: string;
  }) =>
    authFetch<{ explanation: LyricsThemeExplanation }>('/api/ai/explain-theme', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAudioPreview: (title: string, artist: string) =>
    authFetch<AudioPreviewResult>(
      `/api/audio/preview?title=${encodeURIComponent(
        title
      )}&artist=${encodeURIComponent(artist)}`
    ),
  searchYouTube: (title: string, artist: string) =>
    authFetch<YouTubeSearchResult>(
      `/api/audio/youtube?title=${encodeURIComponent(
        title
      )}&artist=${encodeURIComponent(artist)}`
    ),
  composeSoundscape: (payload: {
    moodOrPrompt: string;
    title?: string;
    artist?: string;
    genre?: string;
  }) =>
    authFetch<{ blueprint: SoundscapeBlueprint }>('/api/ai/soundscape', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getInsights: () =>
    authFetch<{ insights: MusicInsightsSummary }>('/api/insights'),
  listJournals: () =>
    authFetch<{ journals: MoodJournalEntry[] }>('/api/journals'),
  createJournal: (payload: {
    moodLabel: string;
    energyLevel: number;
    note: string;
    linkedSongId?: number | null;
    entryDate: string;
  }) =>
    authFetch<{ journal: MoodJournalEntry }>('/api/journals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateJournal: (
    id: number,
    payload: Partial<{
      moodLabel: string;
      energyLevel: number;
      note: string;
      linkedSongId: number | null;
      entryDate: string;
    }>
  ) =>
    authFetch<{ journal: MoodJournalEntry }>(`/api/journals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteJournal: (id: number) =>
    authFetch<{ success: boolean }>(`/api/journals/${id}`, {
      method: 'DELETE',
    }),
};
