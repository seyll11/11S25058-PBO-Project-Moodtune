import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookHeart,
  Check,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import type {
  DistributionStat,
  MoodJournalEntry,
  MusicInsightsSummary,
  Song,
} from '../types/music.ts';

interface InsightsJournalViewProps {
  songs: Song[];
  onAskAiFromJournal: (moodPrompt: string) => void;
  onAddFirstSong: () => void;
  onNotify: (message: string) => void;
}

const MOOD_CHOICES = [
  'Tenang',
  'Bahagia',
  'Fokus',
  'Sedih',
  'Energik',
  'Nostalgia',
  'Lelah',
  'Reflektif',
];

const ENERGY_LABELS: Record<number, string> = {
  1: '1 · Sangat Rendah',
  2: '2 · Rendah',
  3: '3 · Seimbang',
  4: '4 · Tinggi',
  5: '5 · Sangat Tinggi',
};

function formatDateId(isoDate: string) {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  const monthName = months[Number(m) - 1] || m;
  return `${Number(d)} ${monthName} ${y}`;
}

function DistributionList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: DistributionStat[];
  emptyText: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-3">
                  {item.label}
                </span>
                <span className="font-mono text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all"
                  style={{ width: `${Math.max(4, item.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InsightsJournalView({
  songs,
  onAskAiFromJournal,
  onAddFirstSong,
  onNotify,
}: InsightsJournalViewProps) {
  const { playTrackYouTube, isTrackPlaying } = useAudioPlayer();

  const [insights, setInsights] = useState<MusicInsightsSummary | null>(null);
  const [journals, setJournals] = useState<MoodJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Journal form state
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [moodLabel, setMoodLabel] = useState('Tenang');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [entryDate, setEntryDate] = useState(todayStr);
  const [linkedSongId, setLinkedSongId] = useState<string>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState('Semua');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [insightsRes, journalsRes] = await Promise.all([
        api.getInsights(),
        api.listJournals(),
      ]);
      setInsights(insightsRes.insights);
      setJournals(journalsRes.journals);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat statistik dan jurnal mood.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, songs.length]);

  const resetForm = () => {
    setEditingId(null);
    setMoodLabel('Tenang');
    setEnergyLevel(3);
    setEntryDate(todayStr);
    setLinkedSongId('');
    setNote('');
    setFormError(null);
  };

  const handleStartEdit = (entry: MoodJournalEntry) => {
    setEditingId(entry.id);
    setMoodLabel(entry.moodLabel);
    setEnergyLevel(entry.energyLevel);
    setEntryDate(entry.entryDate);
    setLinkedSongId(entry.linkedSongId ? String(entry.linkedSongId) : '');
    setNote(entry.note);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setFormError('Tuliskan catatan singkat mengenai suasana hati Anda.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        moodLabel: moodLabel.trim() || 'Tenang',
        energyLevel,
        note: note.trim(),
        linkedSongId: linkedSongId ? Number(linkedSongId) : null,
        entryDate,
      };

      if (editingId !== null) {
        const res = await api.updateJournal(editingId, payload);
        setJournals((prev) =>
          prev.map((j) => (j.id === editingId ? res.journal : j))
        );
        onNotify('Entri jurnal mood berhasil diperbarui.');
      } else {
        const res = await api.createJournal(payload);
        setJournals((prev) => [res.journal, ...prev]);
        onNotify('Jurnal mood hari ini berhasil disimpan.');
      }
      resetForm();
      const refreshed = await api.getInsights();
      setInsights(refreshed.insights);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan jurnal mood.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJournal = async (id: number) => {
    setDeletingId(id);
    try {
      await api.deleteJournal(id);
      setJournals((prev) => prev.filter((j) => j.id !== id));
      setConfirmDeleteId(null);
      onNotify('Entri jurnal mood dihapus.');
      const refreshed = await api.getInsights();
      setInsights(refreshed.insights);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus entri jurnal.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredJournals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journals.filter((j) => {
      const matchesMood = filterMood === 'Semua' || j.moodLabel === filterMood;
      const matchesQuery =
        !q ||
        j.note.toLowerCase().includes(q) ||
        j.moodLabel.toLowerCase().includes(q) ||
        (j.linkedSong &&
          `${j.linkedSong.title} ${j.linkedSong.artist}`
            .toLowerCase()
            .includes(q));
      return matchesMood && matchesQuery;
    });
  }, [journals, searchQuery, filterMood]);

  const availableJournalMoods = useMemo(() => {
    const set = new Set(journals.map((j) => j.moodLabel));
    return ['Semua', ...Array.from(set)];
  }, [journals]);

  if (loading && !insights) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="text-xs font-semibold underline shrink-0"
          >
            Muat Ulang
          </button>
        </div>
      )}

      {/* KPI Strip */}
      {insights && (
        <section aria-label="Ringkasan statistik koleksi">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Total Lagu Koleksi
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {insights.totalSongs}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                {insights.earliestYear && insights.latestYear
                  ? `Rilis ${insights.earliestYear}–${insights.latestYear}`
                  : 'Belum ada lagu'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Total Playlist
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {insights.totalPlaylists}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Kurasi pribadi &amp; AI
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Artis Unik
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {insights.uniqueArtists}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {insights.topArtists[0]
                  ? `Teratas: ${insights.topArtists[0].label}`
                  : 'Tambahkan lagu dulu'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Entri Jurnal Mood
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {insights.totalJournalEntries}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                {insights.averageEnergy !== null
                  ? `Bulan ini: ${insights.entriesThisMonth} · Energi ${insights.averageEnergy}/5`
                  : 'Belum ada catatan mood'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Music Collection Statistics */}
      {insights && (
        <section
          aria-label="Statistik musik mendalam"
          className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  Statistik Musik Koleksi
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Dihitung otomatis dari lagu tersimpan dan riwayat jurnal mood Anda.
                </p>
              </div>
            </div>
            {insights.totalSongs === 0 && (
              <button
                type="button"
                onClick={onAddFirstSong}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Lagu</span>
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <DistributionList
                title="Distribusi Genre Teratas"
                items={insights.genreBreakdown}
                emptyText="Tambahkan lagu ke koleksi untuk melihat genre favorit Anda."
              />
              <DistributionList
                title="Artis Paling Sering Disimpan"
                items={insights.topArtists}
                emptyText="Belum ada data artis."
              />
            </div>

            <div className="space-y-6">
              <DistributionList
                title="Distribusi Dekade Rilis"
                items={insights.decadeBreakdown}
                emptyText="Belum ada data tahun rilis lagu."
              />
              <DistributionList
                title="Tren Mood Jurnal Harian"
                items={insights.moodBreakdown}
                emptyText="Catat jurnal mood pertama Anda di bawah untuk melihat polanya."
              />
            </div>
          </div>
        </section>
      )}

      {/* Daily Mood Journal Section */}
      <section aria-label="Jurnal mood harian" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Catat / Edit Jurnal */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmitJournal}
            className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookHeart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  {editingId !== null
                    ? 'Edit Catatan Mood'
                    : 'Catat Jurnal Mood Hari Ini'}
                </h2>
              </div>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Batal Edit
                </button>
              )}
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {formError}
              </div>
            )}

            <div>
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Suasana Hati Utama
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_CHOICES.map((choice) => {
                  const active = moodLabel === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setMoodLabel(choice)}
                      className={`min-h-[34px] rounded-lg border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="journal-date"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Tanggal
                </label>
                <input
                  id="journal-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="mt-1 w-full min-h-[42px] rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>

              <div>
                <label
                  htmlFor="journal-energy"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Tingkat Energi
                </label>
                <select
                  id="journal-energy"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="mt-1 w-full min-h-[42px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {ENERGY_LABELS[lvl]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="journal-song"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Lagu Pendamping (Opsional)
              </label>
              <select
                id="journal-song"
                value={linkedSongId}
                onChange={(e) => setLinkedSongId(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">Tidak memilih lagu spesifik</option>
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {s.artist}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="journal-note"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Catatan Refleksi
              </label>
              <textarea
                id="journal-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ceritakan apa yang Anda rasakan hari ini atau suasana musik yang sedang menemani..."
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>
                {saving
                  ? 'Menyimpan...'
                  : editingId !== null
                    ? 'Simpan Perubahan'
                    : 'Simpan Jurnal Mood'}
              </span>
            </button>
          </form>
        </div>

        {/* Timeline Riwayat Jurnal */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari catatan jurnal atau lagu terkait..."
                className="w-full min-h-[42px] rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>

            {availableJournalMoods.length > 1 && (
              <select
                aria-label="Filter mood jurnal"
                value={filterMood}
                onChange={(e) => setFilterMood(e.target.value)}
                className="min-h-[42px] rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {availableJournalMoods.map((m) => (
                  <option key={m} value={m}>
                    {m === 'Semua' ? 'Semua Mood' : m}
                  </option>
                ))}
              </select>
            )}
          </div>

          {filteredJournals.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {journals.length === 0
                  ? 'Belum ada catatan jurnal mood.'
                  : 'Tidak ada entri jurnal yang cocok dengan pencarian.'}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {journals.length === 0
                  ? 'Catat suasana hati harian Anda di sebelah kiri untuk melacak pola emosi dan meminta saran lagu AI.'
                  : 'Coba ubah kata kunci atau filter mood.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {filteredJournals.map((entry) => (
                <article key={entry.id} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono tabular-nums">
                        {formatDateId(entry.entryDate)}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {entry.moodLabel}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">
                        Energi {entry.energyLevel}/5
                      </span>
                    </p>

                    <div className="flex items-center gap-1">
                      {confirmDeleteId === entry.id ? (
                        <>
                          <button
                            type="button"
                            disabled={deletingId === entry.id}
                            onClick={() => void handleDeleteJournal(entry.id)}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            {deletingId === entry.id ? 'Menghapus...' : 'Hapus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry)}
                            aria-label="Edit catatan jurnal"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(entry.id)}
                            aria-label="Hapus catatan jurnal"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
                    {entry.note}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {entry.linkedSong ? (
                      <button
                        type="button"
                        onClick={() =>
                          void playTrackYouTube({
                            title: entry.linkedSong!.title,
                            artist: entry.linkedSong!.artist,
                            genre: entry.linkedSong!.genre,
                          })
                        }
                        className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {isTrackPlaying(
                          entry.linkedSong.title,
                          entry.linkedSong.artist
                        ) ? (
                          <Pause className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Play className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                        <span className="truncate max-w-[240px]">
                          {entry.linkedSong.title} — {entry.linkedSong.artist}
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        Tanpa lagu tertaut
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onAskAiFromJournal(
                          `${entry.moodLabel} — ${entry.note.slice(0, 140)}`
                        )
                      }
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 whitespace-nowrap"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Saran Lagu AI</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
