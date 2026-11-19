import { useState } from 'react';
import { ArrowRight, Disc3, Moon, Sun, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { HERO_STUDIO_IMAGE } from '../lib/covers.ts';

interface AuthGateProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AuthGate({ isDark, onToggleTheme }: AuthGateProps) {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50 flex flex-col">
      {/* Top Bar Contract: Brand wordmark — clean links — single action */}
      <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap shrink-0">
            MoodTune
          </span>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a
              href="#fitur-utama"
              className="hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors whitespace-nowrap shrink-0"
            >
              Kurasi Mood
            </a>
            <a
              href="#fitur-utama"
              className="hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors whitespace-nowrap shrink-0"
            >
              Koleksi &amp; Playlist
            </a>
            <a
              href="#fitur-utama"
              className="hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors whitespace-nowrap shrink-0"
            >
              Makna Lirik
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Ubah ke mode terang' : 'Ubah ke mode gelap'}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleLogin}
              disabled={submitting}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Menghubungkan...' : 'Masuk'}
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-column Editorial Split */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 lg:py-16">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-between lg:col-span-6 lg:py-4">
            <div className="space-y-6">
              <p className="text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400">
                Manajer Playlist &amp; Kurator Musik Berbasis Mood
              </p>

              <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl leading-[1.12]">
                Susun pustaka lagu sesuai suasana hati Anda.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                Simpan koleksi lagu pribadi dan playlist terstruktur di cloud.
                Saat Anda mengetikkan perasaan atau aktivitas, AI memadukan lagu
                favorit Anda dengan temuan baru lalu merangkainya menjadi playlist
                siap putar.
              </p>

              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">Gagal masuk ke akun</p>
                    <p className="text-red-700 dark:text-red-300">{authError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearAuthError}
                    className="text-xs font-medium underline hover:no-underline shrink-0"
                  >
                    Tutup
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={submitting}
                  className="inline-flex min-h-[48px] items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 transition-all whitespace-nowrap shrink-0"
                >
                  <span>
                    {submitting
                      ? 'Membuka Google Sign-In...'
                      : 'Masuk atau Daftar dengan Google'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Akun baru otomatis terdaftar saat Anda masuk pertama kali.
              </p>
            </div>

            {/* 3-Column Feature Strip */}
            <div
              id="fitur-utama"
              className="mt-10 grid grid-cols-1 gap-6 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:grid-cols-3"
            >
              <div>
                <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  01. Katalog Lagu &amp; Playlist
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Catat judul, artis, genre, tahun, dan atur relasi antar playlist secara rapi.
                </p>
              </div>
              <div>
                <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  02. Rekomendasi &amp; Generator
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Gabungan koleksi pribadi dan saran lagu baru sesuai mood atau aktivitas.
                </p>
              </div>
              <div>
                <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  03. Penjelas Tema Lirik
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Pahami makna emosional dan motif utama lagu dalam ringkasan jernih.
                </p>
              </div>
            </div>
          </div>

          {/* Right Media Column */}
          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
              {!imgFailed ? (
                <img
                  src={HERO_STUDIO_IMAGE}
                  alt="Meja studio kurasi musik MoodTune dengan pemutar piringan hitam dan headphone"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[340px] items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-950">
                  <Disc3 className="h-16 w-16 text-zinc-400" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white">
                <p className="text-xs font-medium text-zinc-200">
                  Ruang Kurasi Editorial
                </p>
                <p className="mt-1 font-display text-lg font-semibold leading-snug">
                  Dari suasana fokus belajar hingga malam hujan, setiap lagu punya tempatnya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
