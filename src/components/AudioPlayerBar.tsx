import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function AudioPlayerBar() {
  const {
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
    canPrev,
    canNext,
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
  } = useAudioPlayer();

  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const [ytCompact, setYtCompact] = useState(false);

  useEffect(() => {
    if (mode === 'youtube') {
      registerYouTubeContainer(ytHostRef.current);
      return () => {
        registerYouTubeContainer(null);
      };
    }
    registerYouTubeContainer(null);
    return undefined;
  }, [mode, registerYouTubeContainer]);

  if (mode === 'idle' || !activeTrack) return null;

  const handleSwitchToSoundscape = () => {
    void playSoundscape({
      moodOrPrompt: activeTrack.genre
        ? `${activeTrack.title} oleh ${activeTrack.artist} (${activeTrack.genre})`
        : `${activeTrack.title} oleh ${activeTrack.artist}`,
      title: activeTrack.title,
      artist: activeTrack.artist,
      genre: activeTrack.genre,
    });
  };

  const handleSwitchToPreview = () => {
    void playTrackPreview(activeTrack);
  };

  const handleSwitchToYouTube = () => {
    void playTrackYouTube(activeTrack);
  };

  const handleCycleCandidate = () => {
    if (ytCandidates.length <= 1) return;
    const nextIdx = (ytCandidateIndex + 1) % ytCandidates.length;
    switchYouTubeCandidate(nextIdx);
  };

  const maxDuration = duration > 0 ? duration : mode === 'preview' ? 30 : 180;
  const hasSeekableTimeline = mode === 'youtube' || mode === 'preview';

  return (
    <>
      {/* Single Persistent YouTube Video Stage (inline in flow on mobile, floating above dock on desktop) */}
      {mode === 'youtube' && !error && (
        <div
          className={`mb-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:mb-0 lg:fixed lg:bottom-[84px] lg:right-6 lg:z-30 lg:shadow-xl transition-all ${
            ytCompact ? 'lg:w-56' : 'lg:w-80'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-1.5 min-w-0">
              <Youtube className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-500" />
              <span className="truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                {activeYouTube?.title || `${activeTrack.title} — ${activeTrack.artist}`}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {ytCandidates.length > 1 && (
                <button
                  type="button"
                  onClick={handleCycleCandidate}
                  title="Ganti versi video YouTube lain"
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>
                    {ytCandidateIndex + 1}/{ytCandidates.length}
                  </span>
                </button>
              )}

              {activeYouTube?.watchUrl && (
                <a
                  href={activeYouTube.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Buka di YouTube"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <button
                type="button"
                onClick={() => setYtCompact((v) => !v)}
                aria-label={ytCompact ? 'Perbesar video' : 'Perkecil video'}
                title={ytCompact ? 'Perbesar mini-player' : 'Perkecil mini-player'}
                className="hidden lg:inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                {ytCompact ? (
                  <Maximize2 className="h-3 w-3" />
                ) : (
                  <Minimize2 className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          <div className="relative w-full aspect-video bg-black">
            <div ref={ytHostRef} className="h-full w-full" />
            {isLoading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Bottom Dock Player */}
      <aside
        aria-label="Pemutar audio MoodTune"
        className="hidden lg:flex fixed bottom-0 left-64 right-0 z-30 h-[72px] items-center justify-between gap-5 border-t border-zinc-200 bg-white/95 px-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95"
      >
        {/* Left: Track / Soundscape Info */}
        <div className="flex items-center gap-3 min-w-0 w-72 shrink-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-blue-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-blue-400">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'youtube' ? (
              <Youtube className="h-4 w-4 text-red-600 dark:text-red-500" />
            ) : (
              <AudioLines className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {mode === 'soundscape' && soundscape
                ? soundscape.title
                : activeTrack.title}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'soundscape' ? (
                <span>
                  AI Soundscape
                  {soundscape ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">
                        {soundscape.bpm} BPM
                      </span>
                      {activeChord && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">{activeChord}</span>
                        </>
                      )}
                    </>
                  ) : null}
                </span>
              ) : mode === 'youtube' ? (
                <span>
                  {activeTrack.artist}
                  <span aria-hidden="true"> · </span>
                  <span>
                    YouTube{activeYouTube?.channel ? ` (${activeYouTube.channel})` : ' Penuh'}
                  </span>
                </span>
              ) : (
                <span>
                  {activeTrack.artist}
                  <span aria-hidden="true"> · </span>
                  <span>Pratinjau 30 detik</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Playback Controls & Progress / Error */}
        <div className="flex flex-1 max-w-xl flex-col items-center gap-1.5 min-w-0">
          {error ? (
            <div className="flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 max-w-full">
              <span className="truncate">{error}</span>
              {activeYouTube?.watchUrl && (
                <a
                  href={activeYouTube.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Buka YouTube</span>
                </a>
              )}
              {mode === 'youtube' && (
                <button
                  type="button"
                  onClick={handleSwitchToPreview}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 shrink-0"
                >
                  Coba 30s
                </button>
              )}
              <button
                type="button"
                onClick={handleSwitchToSoundscape}
                className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300 shrink-0"
              >
                AI Soundscape
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {hasSeekableTimeline && (
                  <button
                    type="button"
                    disabled={!canPrev || isLoading}
                    onClick={() => void prevTrack()}
                    aria-label="Lagu sebelumnya"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  disabled={isLoading && mode !== 'youtube'}
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? 'Jeda' : 'Putar'}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </button>

                {hasSeekableTimeline && (
                  <button
                    type="button"
                    disabled={!canNext || isLoading}
                    onClick={() => void nextTrack()}
                    aria-label="Lagu berikutnya"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                )}
              </div>

              {hasSeekableTimeline ? (
                <div className="flex w-full items-center gap-2.5">
                  <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums w-10 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={maxDuration}
                    step={0.5}
                    value={Math.min(currentTime, maxDuration)}
                    onChange={(e) => seek(Number(e.target.value))}
                    aria-label="Posisi pemutaran"
                    className="h-1 flex-1 cursor-pointer accent-blue-600"
                  />
                  <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums w-10">
                    {duration > 0
                      ? formatTime(duration)
                      : activeYouTube?.durationText || '--:--'}
                  </span>
                </div>
              ) : (
                soundscape && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-full">
                    {soundscape.scaleName} · {soundscape.moodDescription}
                  </p>
                )
              )}
            </>
          )}
        </div>

        {/* Right: Mode Switch + Volume + Close */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTrack.artist !== 'MoodTune AI Soundscape' && (
            <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
              <button
                type="button"
                onClick={handleSwitchToYouTube}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  mode === 'youtube'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={handleSwitchToPreview}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  mode === 'preview'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                30s
              </button>
              <button
                type="button"
                onClick={handleSwitchToSoundscape}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  mode === 'soundscape'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                AI Sound
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVolume(volume > 0 ? 0 : 0.75)}
              aria-label={volume === 0 ? 'Nyalakan suara' : 'Bisukan suara'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-20 h-1 cursor-pointer accent-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={stopAll}
            aria-label="Tutup pemutar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Compact Inline Now-Playing Card (non-fixed so mobile sticky cap <= 15% is strictly honored) */}
      <div className="lg:hidden mb-4 rounded-2xl border border-zinc-200 bg-white p-3.5 space-y-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              disabled={(isLoading && mode !== 'youtube') || Boolean(error)}
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Jeda' : 'Putar'}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {mode === 'soundscape' && soundscape
                  ? soundscape.title
                  : activeTrack.title}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {mode === 'soundscape'
                  ? `AI Soundscape · ${soundscape?.bpm || 74} BPM${
                      activeChord ? ` · ${activeChord}` : ''
                    }`
                  : mode === 'youtube'
                    ? `${activeTrack.artist} · YouTube Penuh`
                    : `${activeTrack.artist} · Pratinjau 30s`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasSeekableTimeline && canPrev && (
              <button
                type="button"
                onClick={() => void prevTrack()}
                aria-label="Lagu sebelumnya"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300"
              >
                <SkipBack className="h-4 w-4" />
              </button>
            )}
            {hasSeekableTimeline && canNext && (
              <button
                type="button"
                onClick={() => void nextTrack()}
                aria-label="Lagu berikutnya"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={stopAll}
              aria-label="Tutup pemutar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {hasSeekableTimeline && !error && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums w-9">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={maxDuration}
              step={0.5}
              value={Math.min(currentTime, maxDuration)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Posisi pemutaran"
              className="h-1 flex-1 cursor-pointer accent-blue-600"
            />
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums w-9 text-right">
              {duration > 0
                ? formatTime(duration)
                : activeYouTube?.durationText || '--:--'}
            </span>
          </div>
        )}

        {activeTrack.artist !== 'MoodTune AI Soundscape' && !error && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
              <button
                type="button"
                onClick={handleSwitchToYouTube}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  mode === 'youtube'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                YouTube Penuh
              </button>
              <button
                type="button"
                onClick={handleSwitchToPreview}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  mode === 'preview'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                30s
              </button>
              <button
                type="button"
                onClick={handleSwitchToSoundscape}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  mode === 'soundscape'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                AI Sound
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 text-xs text-red-600 dark:border-zinc-800 dark:text-red-400">
            <span>{error}</span>
            <div className="flex flex-wrap items-center gap-2">
              {activeYouTube?.watchUrl && (
                <a
                  href={activeYouTube.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Buka YouTube</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleSwitchToPreview}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                Coba 30s
              </button>
              <button
                type="button"
                onClick={handleSwitchToSoundscape}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                AI Soundscape
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
