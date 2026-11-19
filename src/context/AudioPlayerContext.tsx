import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { api } from '../lib/api.ts';
import { SoundscapeSynth } from '../lib/soundscapeSynth.ts';
import {
  loadYouTubeIframeApi,
  type YTPlayerInstance,
} from '../lib/youtubePlayer.ts';
import type { SoundscapeBlueprint, YouTubeCandidate } from '../types/music.ts';

export interface PlayableTrack {
  title: string;
  artist: string;
  genre?: string;
}

type PlayerMode = 'idle' | 'youtube' | 'preview' | 'soundscape';

interface AudioPlayerContextValue {
  mode: PlayerMode;
  activeTrack: PlayableTrack | null;
  soundscape: SoundscapeBlueprint | null;
  activeChord: string | null;
  ytCandidates: YouTubeCandidate[];
  ytCandidateIndex: number;
  activeYouTube: YouTubeCandidate | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  canPrev: boolean;
  canNext: boolean;
  registerYouTubeContainer: (el: HTMLDivElement | null) => void;
  playTrackYouTube: (track: PlayableTrack, queue?: PlayableTrack[]) => Promise<void>;
  playTrackPreview: (track: PlayableTrack, queue?: PlayableTrack[]) => Promise<void>;
  playSoundscape: (options: {
    moodOrPrompt: string;
    title?: string;
    artist?: string;
    genre?: string;
  }) => Promise<void>;
  switchYouTubeCandidate: (index: number) => void;
  togglePlayPause: () => void;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  stopAll: () => void;
  isTrackPlaying: (title: string, artist: string) => boolean;
  isTrackSelected: (title: string, artist: string) => boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SoundscapeSynth | null>(null);

  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = useRef(false);
  const pendingVideoIdRef = useRef<string | null>(null);
  const ytPollRef = useRef<number | null>(null);
  const ytRequestIdRef = useRef(0);

  const [mode, setMode] = useState<PlayerMode>('idle');
  const modeRef = useRef<PlayerMode>('idle');

  const [activeTrack, setActiveTrack] = useState<PlayableTrack | null>(null);
  const [soundscape, setSoundscape] = useState<SoundscapeBlueprint | null>(null);
  const [activeChord, setActiveChord] = useState<string | null>(null);

  const [ytCandidates, setYtCandidates] = useState<YouTubeCandidate[]>([]);
  const ytCandidatesRef = useRef<YouTubeCandidate[]>([]);
  const [ytCandidateIndex, setYtCandidateIndex] = useState(0);
  const ytCandidateIndexRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolumeState] = useState(0.75);
  const volumeRef = useRef(0.75);

  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const queueRef = useRef<PlayableTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const queueIndexRef = useRef(-1);

  const nextTrackRef = useRef<(() => Promise<void>) | null>(null);

  const updateMode = useCallback((nextMode: PlayerMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  }, []);

  const ensureSynth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new SoundscapeSynth();
    }
    return synthRef.current;
  }, []);

  const stopPreviewAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setCurrentTime(0);
  }, []);

  const stopSoundscape = useCallback(() => {
    synthRef.current?.stop();
    setActiveChord(null);
  }, []);

  const stopYouTubePoll = useCallback(() => {
    if (ytPollRef.current !== null) {
      window.clearInterval(ytPollRef.current);
      ytPollRef.current = null;
    }
  }, []);

  const destroyYouTubePlayer = useCallback(() => {
    stopYouTubePoll();
    pendingVideoIdRef.current = null;
    ytReadyRef.current = false;
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch {
        // Ignore teardown race
      }
      ytPlayerRef.current = null;
    }
    if (ytHostRef.current) {
      ytHostRef.current.innerHTML = '';
    }
  }, [stopYouTubePoll]);

  const stopAll = useCallback(() => {
    ytRequestIdRef.current += 1;
    stopPreviewAudio();
    stopSoundscape();
    destroyYouTubePlayer();
    updateMode('idle');
    setActiveTrack(null);
    setSoundscape(null);
    ytCandidatesRef.current = [];
    setYtCandidates([]);
    ytCandidateIndexRef.current = 0;
    setYtCandidateIndex(0);
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
    setCurrentTime(0);
    setDuration(30);
  }, [stopPreviewAudio, stopSoundscape, destroyYouTubePlayer, updateMode]);

  const startYouTubePoll = useCallback(() => {
    stopYouTubePoll();
    ytPollRef.current = window.setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current || modeRef.current !== 'youtube') {
        return;
      }
      try {
        const cur = player.getCurrentTime?.() || 0;
        const dur = player.getDuration?.() || 0;
        if (Number.isFinite(cur)) setCurrentTime(cur);
        if (Number.isFinite(dur) && dur > 0) setDuration(dur);
      } catch {
        // Ignore transient YT API read failure
      }
    }, 450);
  }, [stopYouTubePoll]);

  const mountAndLoadYouTube = useCallback(
    async (videoId: string) => {
      pendingVideoIdRef.current = videoId;

      if (ytPlayerRef.current && ytReadyRef.current) {
        setCurrentTime(0);
        setDuration(0);
        ytPlayerRef.current.loadVideoById(videoId);
        pendingVideoIdRef.current = null;
        startYouTubePoll();
        return;
      }

      const host = ytHostRef.current;
      if (!host) {
        // Will be picked up as soon as AudioPlayerBar mounts the host element
        return;
      }

      try {
        const YT = await loadYouTubeIframeApi();
        if (modeRef.current !== 'youtube' || ytHostRef.current !== host) {
          return;
        }

        // If another mount completed while awaiting script
        if (ytPlayerRef.current && ytReadyRef.current) {
          ytPlayerRef.current.loadVideoById(videoId);
          pendingVideoIdRef.current = null;
          startYouTubePoll();
          return;
        }

        host.innerHTML = '';
        const mountNode = document.createElement('div');
        mountNode.style.width = '100%';
        mountNode.style.height = '100%';
        host.appendChild(mountNode);

        ytReadyRef.current = false;
        const created = new YT.Player(mountNode, {
          width: '100%',
          height: '100%',
          videoId,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              ytReadyRef.current = true;
              event.target.setVolume(Math.round(volumeRef.current * 100));
              const latestPending = pendingVideoIdRef.current;
              pendingVideoIdRef.current = null;
              if (latestPending && latestPending !== videoId) {
                event.target.loadVideoById(latestPending);
              } else {
                event.target.playVideo();
              }
              startYouTubePoll();
            },
            onStateChange: (event) => {
              if (modeRef.current !== 'youtube') return;
              const state = event.data;
              if (state === 1) {
                // PLAYING
                setIsPlaying(true);
                setIsLoading(false);
                setError(null);
                const dur = event.target.getDuration?.() || 0;
                if (Number.isFinite(dur) && dur > 0) setDuration(dur);
              } else if (state === 2) {
                // PAUSED
                setIsPlaying(false);
                setIsLoading(false);
              } else if (state === 3) {
                // BUFFERING
                setIsLoading(true);
              } else if (state === 0) {
                // ENDED
                setIsPlaying(false);
                if (
                  queueIndexRef.current >= 0 &&
                  queueIndexRef.current < queueRef.current.length - 1
                ) {
                  void nextTrackRef.current?.();
                }
              }
            },
            onError: () => {
              if (modeRef.current !== 'youtube') return;
              const list = ytCandidatesRef.current;
              const nextIdx = ytCandidateIndexRef.current + 1;
              if (nextIdx < list.length) {
                ytCandidateIndexRef.current = nextIdx;
                setYtCandidateIndex(nextIdx);
                const fallback = list[nextIdx];
                setError(null);
                setIsLoading(true);
                void mountAndLoadYouTube(fallback.videoId);
              } else {
                setIsLoading(false);
                setIsPlaying(false);
                setError(
                  'Video YouTube tidak dapat diputar langsung di embed. Buka video di YouTube atau putar Pratinjau 30s / AI Soundscape.'
                );
              }
            },
          },
        });

        ytPlayerRef.current = created;
      } catch (err) {
        setIsLoading(false);
        setIsPlaying(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat pemutar YouTube.'
        );
      }
    },
    [startYouTubePoll]
  );

  const registerYouTubeContainer = useCallback(
    (el: HTMLDivElement | null) => {
      ytHostRef.current = el;
      if (el && modeRef.current === 'youtube' && pendingVideoIdRef.current) {
        void mountAndLoadYouTube(pendingVideoIdRef.current);
      }
      if (!el && modeRef.current !== 'youtube') {
        destroyYouTubePlayer();
      }
    },
    [mountAndLoadYouTube, destroyYouTubePlayer]
  );

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else {
        setDuration(30);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      synthRef.current?.stop();
      destroyYouTubePlayer();
    };
  }, [destroyYouTubePlayer]);

  const applyQueue = useCallback(
    (track: PlayableTrack, newQueue?: PlayableTrack[]) => {
      if (newQueue && newQueue.length > 0) {
        queueRef.current = newQueue;
        setQueue(newQueue);
        const idx = newQueue.findIndex(
          (item) =>
            item.title.toLowerCase() === track.title.toLowerCase() &&
            item.artist.toLowerCase() === track.artist.toLowerCase()
        );
        const resolvedIdx = idx >= 0 ? idx : 0;
        queueIndexRef.current = resolvedIdx;
        setQueueIndex(resolvedIdx);
      }
    },
    []
  );

  const playTrackYouTube = useCallback(
    async (track: PlayableTrack, newQueue?: PlayableTrack[]) => {
      if (
        modeRef.current === 'youtube' &&
        activeTrack &&
        activeTrack.title.toLowerCase() === track.title.toLowerCase() &&
        activeTrack.artist.toLowerCase() === track.artist.toLowerCase() &&
        ytPlayerRef.current &&
        ytReadyRef.current &&
        !error
      ) {
        const state = ytPlayerRef.current.getPlayerState?.();
        if (state === 1) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
        return;
      }

      const reqId = ++ytRequestIdRef.current;
      stopPreviewAudio();
      stopSoundscape();
      updateMode('youtube');
      setActiveTrack(track);
      setSoundscape(null);
      setError(null);
      setIsPlaying(false);
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);
      ytCandidatesRef.current = [];
      setYtCandidates([]);
      ytCandidateIndexRef.current = 0;
      setYtCandidateIndex(0);

      applyQueue(track, newQueue);

      try {
        const res = await api.searchYouTube(track.title, track.artist);
        if (reqId !== ytRequestIdRef.current || modeRef.current !== 'youtube') {
          return;
        }
        if (!res.found || res.candidates.length === 0) {
          setIsLoading(false);
          setError(
            res.message ||
              'Video YouTube tidak ditemukan. Coba putar Pratinjau 30 detik atau AI Soundscape.'
          );
          return;
        }

        ytCandidatesRef.current = res.candidates;
        setYtCandidates(res.candidates);
        ytCandidateIndexRef.current = 0;
        setYtCandidateIndex(0);
        await mountAndLoadYouTube(res.candidates[0].videoId);
      } catch (err) {
        if (reqId !== ytRequestIdRef.current) return;
        setIsLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal mencari video YouTube untuk lagu ini.'
        );
      }
    },
    [
      activeTrack,
      error,
      stopPreviewAudio,
      stopSoundscape,
      updateMode,
      applyQueue,
      mountAndLoadYouTube,
    ]
  );

  const switchYouTubeCandidate = useCallback(
    (index: number) => {
      const list = ytCandidatesRef.current;
      if (index < 0 || index >= list.length) return;
      ytCandidateIndexRef.current = index;
      setYtCandidateIndex(index);
      setError(null);
      setIsLoading(true);
      updateMode('youtube');
      void mountAndLoadYouTube(list[index].videoId);
    },
    [updateMode, mountAndLoadYouTube]
  );

  const playTrackPreview = useCallback(
    async (track: PlayableTrack, newQueue?: PlayableTrack[]) => {
      if (
        modeRef.current === 'preview' &&
        activeTrack &&
        activeTrack.title.toLowerCase() === track.title.toLowerCase() &&
        activeTrack.artist.toLowerCase() === track.artist.toLowerCase() &&
        audioRef.current?.src &&
        !error
      ) {
        if (audioRef.current.paused) {
          await audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
        return;
      }

      ytRequestIdRef.current += 1;
      destroyYouTubePlayer();
      stopSoundscape();
      stopPreviewAudio();
      updateMode('preview');
      setActiveTrack(track);
      setSoundscape(null);
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);

      applyQueue(track, newQueue);

      try {
        const res = await api.getAudioPreview(track.title, track.artist);
        if (!res.found || !res.previewUrl) {
          setError(
            res.message ||
              'Cuplikan audio resmi 30 detik belum tersedia. Coba putar via YouTube atau AI Soundscape!'
          );
          setIsLoading(false);
          return;
        }

        const audio = audioRef.current;
        if (!audio) return;
        audio.src = res.previewUrl;
        audio.volume = volumeRef.current;
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memutar pratinjau audio lagu.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeTrack,
      error,
      destroyYouTubePlayer,
      stopPreviewAudio,
      stopSoundscape,
      updateMode,
      applyQueue,
    ]
  );

  const nextTrack = useCallback(async () => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (q.length === 0 || idx < 0 || idx >= q.length - 1) return;
    const next = q[idx + 1];
    queueIndexRef.current = idx + 1;
    setQueueIndex(idx + 1);
    if (modeRef.current === 'youtube') {
      await playTrackYouTube(next);
    } else {
      await playTrackPreview(next);
    }
  }, [playTrackYouTube, playTrackPreview]);

  nextTrackRef.current = nextTrack;

  const prevTrack = useCallback(async () => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (q.length === 0 || idx <= 0) return;
    const prev = q[idx - 1];
    queueIndexRef.current = idx - 1;
    setQueueIndex(idx - 1);
    if (modeRef.current === 'youtube') {
      await playTrackYouTube(prev);
    } else {
      await playTrackPreview(prev);
    }
  }, [playTrackYouTube, playTrackPreview]);

  // Auto-advance when preview audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      setIsPlaying(false);
      if (
        modeRef.current === 'preview' &&
        queueIndexRef.current >= 0 &&
        queueIndexRef.current < queueRef.current.length - 1
      ) {
        void nextTrack();
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [nextTrack]);

  const playSoundscape = useCallback(
    async (options: {
      moodOrPrompt: string;
      title?: string;
      artist?: string;
      genre?: string;
    }) => {
      ytRequestIdRef.current += 1;
      destroyYouTubePlayer();
      stopPreviewAudio();
      stopSoundscape();
      updateMode('soundscape');
      setActiveTrack(
        options.title
          ? {
              title: options.title,
              artist: options.artist || 'AI Soundscape',
              genre: options.genre,
            }
          : {
              title: options.moodOrPrompt,
              artist: 'MoodTune AI Soundscape',
            }
      );
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);

      try {
        const res = await api.composeSoundscape(options);
        setSoundscape(res.blueprint);
        const synth = ensureSynth();
        synth.setVolume(volumeRef.current);
        synth.start(res.blueprint, (chordName) => {
          setActiveChord(chordName);
        });
        setIsPlaying(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal menyusun audio soundscape AI.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      destroyYouTubePlayer,
      stopPreviewAudio,
      stopSoundscape,
      updateMode,
      ensureSynth,
    ]
  );

  const togglePlayPause = useCallback(() => {
    if (modeRef.current === 'youtube' && ytPlayerRef.current && ytReadyRef.current) {
      const state = ytPlayerRef.current.getPlayerState?.();
      if (state === 1) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
      return;
    }

    if (modeRef.current === 'preview' && audioRef.current) {
      if (audioRef.current.paused) {
        void audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
      return;
    }

    if (modeRef.current === 'soundscape' && soundscape) {
      const synth = ensureSynth();
      if (isPlaying) {
        synth.stop();
        setIsPlaying(false);
      } else {
        synth.setVolume(volumeRef.current);
        synth.start(soundscape, (chordName) => {
          setActiveChord(chordName);
        });
        setIsPlaying(true);
      }
    }
  }, [soundscape, isPlaying, ensureSynth]);

  const seek = useCallback(
    (seconds: number) => {
      if (
        modeRef.current === 'youtube' &&
        ytPlayerRef.current &&
        ytReadyRef.current
      ) {
        const target = Math.max(0, Math.min(duration || seconds, seconds));
        ytPlayerRef.current.seekTo(target, true);
        setCurrentTime(target);
        return;
      }
      if (
        modeRef.current === 'preview' &&
        audioRef.current &&
        audioRef.current.src
      ) {
        audioRef.current.currentTime = Math.max(0, Math.min(duration, seconds));
        setCurrentTime(audioRef.current.currentTime);
      }
    },
    [duration]
  );

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (ytPlayerRef.current && ytReadyRef.current) {
      ytPlayerRef.current.setVolume(Math.round(clamped * 100));
    }
    synthRef.current?.setVolume(clamped);
  }, []);

  const isTrackSelected = useCallback(
    (title: string, artist: string) =>
      Boolean(
        activeTrack &&
          activeTrack.title.toLowerCase() === title.toLowerCase() &&
          activeTrack.artist.toLowerCase() === artist.toLowerCase()
      ),
    [activeTrack]
  );

  const isTrackPlaying = useCallback(
    (title: string, artist: string) =>
      isPlaying && isTrackSelected(title, artist),
    [isPlaying, isTrackSelected]
  );

  const activeYouTube =
    ytCandidates.length > 0 && ytCandidateIndex < ytCandidates.length
      ? ytCandidates[ytCandidateIndex]
      : null;

  return (
    <AudioPlayerContext.Provider
      value={{
        mode,
        activeTrack,
        soundscape,
        activeChord,
        ytCandidates,
        ytCandidateIndex,
        activeYouTube,
        isPlaying,
        isLoading,
        error,
        currentTime,
        duration,
        volume,
        canPrev:
          (mode === 'youtube' || mode === 'preview') && queueIndex > 0,
        canNext:
          (mode === 'youtube' || mode === 'preview') &&
          queueIndex >= 0 &&
          queueIndex < queue.length - 1,
        registerYouTubeContainer,
        playTrackYouTube,
        playTrackPreview,
        playSoundscape,
        switchYouTubeCandidate,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        stopAll,
        isTrackPlaying,
        isTrackSelected,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error('useAudioPlayer harus dipakai di dalam AudioPlayerProvider.');
  }
  return ctx;
}
