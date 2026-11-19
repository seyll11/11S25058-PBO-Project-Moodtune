export type CoverVariant = 'focus' | 'rain' | 'morning';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
}

export interface Song {
  id: number;
  userId: number;
  title: string;
  artist: string;
  genre: string;
  releaseYear: number;
  moodNote: string | null;
  createdAt: string;
}

export interface PlaylistTrack extends Song {
  position: number;
  addedAt: string;
}

export interface Playlist {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  moodTag: string | null;
  coverVariant: CoverVariant;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetail extends Playlist {
  tracks: PlaylistTrack[];
}

export interface RecommendedTrack {
  source: 'library' | 'new';
  songId: number | null;
  title: string;
  artist: string;
  genre: string;
  releaseYear: number;
  reason: string;
}

export interface MoodRecommendationResponse {
  moodSummary: string;
  curationNote: string;
  recommendations: RecommendedTrack[];
}

export interface GeneratedPlaylistDraft {
  name: string;
  description: string;
  moodTag: string;
  coverVariant: CoverVariant;
  tracks: RecommendedTrack[];
}

export interface LyricsThemeExplanation {
  title: string;
  artist: string;
  coreTheme: string;
  emotionalTone: string;
  meaningOverview: string;
  keyMotifs: string[];
  listeningContext: string;
}

export interface AudioPreviewResult {
  found: boolean;
  previewUrl: string | null;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  trackViewUrl?: string;
  message?: string;
}

export interface SoundscapeChord {
  name: string;
  frequencies: number[];
  melodyFrequencies: number[];
}

export interface SoundscapeBlueprint {
  title: string;
  moodDescription: string;
  bpm: number;
  waveform: 'sine' | 'triangle' | 'warm-pad';
  scaleName: string;
  chords: SoundscapeChord[];
}

export interface YouTubeCandidate {
  videoId: string;
  title: string;
  channel: string;
  durationText?: string;
  watchUrl: string;
}

export interface YouTubeSearchResult {
  found: boolean;
  candidates: YouTubeCandidate[];
  message?: string;
}
