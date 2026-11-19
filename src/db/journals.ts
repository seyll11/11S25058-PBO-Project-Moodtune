import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { moodJournals, playlists, songs } from './schema.ts';
import type {
  DistributionStat,
  MoodJournalEntry,
  MusicInsightsSummary,
} from '../types/music.ts';

export interface CreateMoodJournalInput {
  moodLabel: string;
  energyLevel: number;
  note: string;
  linkedSongId?: number | null;
  entryDate: string;
}

export interface UpdateMoodJournalInput {
  moodLabel?: string;
  energyLevel?: number;
  note?: string;
  linkedSongId?: number | null;
  entryDate?: string;
}

function mapJournalRow(row: {
  id: number;
  userId: number;
  moodLabel: string;
  energyLevel: number;
  note: string;
  linkedSongId: number | null;
  entryDate: string;
  createdAt: Date;
  updatedAt: Date;
  songId: number | null;
  songTitle: string | null;
  songArtist: string | null;
  songGenre: string | null;
}): MoodJournalEntry {
  return {
    id: row.id,
    userId: row.userId,
    moodLabel: row.moodLabel,
    energyLevel: row.energyLevel,
    note: row.note,
    linkedSongId: row.linkedSongId,
    linkedSong:
      row.songId && row.songTitle && row.songArtist
        ? {
            id: row.songId,
            title: row.songTitle,
            artist: row.songArtist,
            genre: row.songGenre || 'Pop',
          }
        : null,
    entryDate: row.entryDate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getJournalByIdForUser(
  userId: number,
  journalId: number
): Promise<MoodJournalEntry | null> {
  const rows = await db
    .select({
      id: moodJournals.id,
      userId: moodJournals.userId,
      moodLabel: moodJournals.moodLabel,
      energyLevel: moodJournals.energyLevel,
      note: moodJournals.note,
      linkedSongId: moodJournals.linkedSongId,
      entryDate: moodJournals.entryDate,
      createdAt: moodJournals.createdAt,
      updatedAt: moodJournals.updatedAt,
      songId: songs.id,
      songTitle: songs.title,
      songArtist: songs.artist,
      songGenre: songs.genre,
    })
    .from(moodJournals)
    .leftJoin(songs, eq(moodJournals.linkedSongId, songs.id))
    .where(and(eq(moodJournals.id, journalId), eq(moodJournals.userId, userId)));

  return rows[0] ? mapJournalRow(rows[0]) : null;
}

async function validateOwnedSongId(
  userId: number,
  linkedSongId: number | null | undefined
): Promise<number | null> {
  if (!linkedSongId) return null;
  const [found] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.id, linkedSongId), eq(songs.userId, userId)));
  return found ? found.id : null;
}

export async function listJournalsByUser(
  userId: number
): Promise<MoodJournalEntry[]> {
  try {
    const rows = await db
      .select({
        id: moodJournals.id,
        userId: moodJournals.userId,
        moodLabel: moodJournals.moodLabel,
        energyLevel: moodJournals.energyLevel,
        note: moodJournals.note,
        linkedSongId: moodJournals.linkedSongId,
        entryDate: moodJournals.entryDate,
        createdAt: moodJournals.createdAt,
        updatedAt: moodJournals.updatedAt,
        songId: songs.id,
        songTitle: songs.title,
        songArtist: songs.artist,
        songGenre: songs.genre,
      })
      .from(moodJournals)
      .leftJoin(songs, eq(moodJournals.linkedSongId, songs.id))
      .where(eq(moodJournals.userId, userId))
      .orderBy(desc(moodJournals.entryDate), desc(moodJournals.id));

    return rows.map(mapJournalRow);
  } catch (error) {
    console.error('listJournalsByUser failed:', error);
    throw new Error('Gagal memuat riwayat jurnal mood.', { cause: error });
  }
}

export async function createJournalForUser(
  userId: number,
  input: CreateMoodJournalInput
): Promise<MoodJournalEntry> {
  try {
    const validSongId = await validateOwnedSongId(userId, input.linkedSongId);
    const [created] = await db
      .insert(moodJournals)
      .values({
        userId,
        moodLabel: input.moodLabel,
        energyLevel: input.energyLevel,
        note: input.note,
        linkedSongId: validSongId,
        entryDate: input.entryDate,
      })
      .returning();

    const full = await getJournalByIdForUser(userId, created.id);
    if (!full) {
      throw new Error('Entri jurnal tidak ditemukan setelah disimpan.');
    }
    return full;
  } catch (error) {
    console.error('createJournalForUser failed:', error);
    throw new Error('Gagal menyimpan entri jurnal mood.', { cause: error });
  }
}

export async function updateJournalForUser(
  userId: number,
  journalId: number,
  input: UpdateMoodJournalInput
): Promise<MoodJournalEntry | null> {
  try {
    const validSongId =
      input.linkedSongId !== undefined
        ? await validateOwnedSongId(userId, input.linkedSongId)
        : undefined;

    const [updated] = await db
      .update(moodJournals)
      .set({
        ...(input.moodLabel !== undefined ? { moodLabel: input.moodLabel } : {}),
        ...(input.energyLevel !== undefined
          ? { energyLevel: input.energyLevel }
          : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(validSongId !== undefined ? { linkedSongId: validSongId } : {}),
        ...(input.entryDate !== undefined ? { entryDate: input.entryDate } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(moodJournals.id, journalId), eq(moodJournals.userId, userId))
      )
      .returning();

    if (!updated) return null;
    return await getJournalByIdForUser(userId, updated.id);
  } catch (error) {
    console.error('updateJournalForUser failed:', error);
    throw new Error('Gagal memperbarui entri jurnal mood.', { cause: error });
  }
}

export async function deleteJournalForUser(
  userId: number,
  journalId: number
): Promise<boolean> {
  try {
    const deleted = await db
      .delete(moodJournals)
      .where(
        and(eq(moodJournals.id, journalId), eq(moodJournals.userId, userId))
      )
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('deleteJournalForUser failed:', error);
    throw new Error('Gagal menghapus entri jurnal mood.', { cause: error });
  }
}

function buildDistribution(
  counts: Map<string, number>,
  total: number,
  limit = 6
): DistributionStat[] {
  if (total === 0) return [];
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / total) * 100),
    }));
}

export async function getMusicInsightsForUser(
  userId: number
): Promise<MusicInsightsSummary> {
  try {
    const [userSongs, userPlaylists, userJournals] = await Promise.all([
      db.select().from(songs).where(eq(songs.userId, userId)),
      db.select({ id: playlists.id }).from(playlists).where(eq(playlists.userId, userId)),
      db.select().from(moodJournals).where(eq(moodJournals.userId, userId)),
    ]);

    const genreCounts = new Map<string, number>();
    const decadeCounts = new Map<string, number>();
    const artistCounts = new Map<string, number>();
    const uniqueArtistsSet = new Set<string>();
    let earliestYear: number | null = null;
    let latestYear: number | null = null;

    for (const s of userSongs) {
      const genre = s.genre.trim() || 'Lainnya';
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);

      const artist = s.artist.trim();
      if (artist) {
        uniqueArtistsSet.add(artist.toLowerCase());
        artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      }

      const decade = `${Math.floor(s.releaseYear / 10) * 10}-an`;
      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + 1);

      if (earliestYear === null || s.releaseYear < earliestYear) {
        earliestYear = s.releaseYear;
      }
      if (latestYear === null || s.releaseYear > latestYear) {
        latestYear = s.releaseYear;
      }
    }

    const moodCounts = new Map<string, number>();
    let energySum = 0;
    const nowMonthPrefix = new Date().toISOString().slice(0, 7);
    let entriesThisMonth = 0;

    for (const j of userJournals) {
      const label = j.moodLabel.trim() || 'Lainnya';
      moodCounts.set(label, (moodCounts.get(label) || 0) + 1);
      energySum += j.energyLevel;
      if (j.entryDate.startsWith(nowMonthPrefix)) {
        entriesThisMonth += 1;
      }
    }

    const decadeBreakdown = Array.from(decadeCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({
        label,
        count,
        percentage:
          userSongs.length > 0 ? Math.round((count / userSongs.length) * 100) : 0,
      }));

    return {
      totalSongs: userSongs.length,
      totalPlaylists: userPlaylists.length,
      uniqueArtists: uniqueArtistsSet.size,
      totalJournalEntries: userJournals.length,
      entriesThisMonth,
      averageEnergy:
        userJournals.length > 0
          ? Number((energySum / userJournals.length).toFixed(1))
          : null,
      earliestYear,
      latestYear,
      genreBreakdown: buildDistribution(genreCounts, userSongs.length, 6),
      decadeBreakdown,
      topArtists: buildDistribution(artistCounts, userSongs.length, 5),
      moodBreakdown: buildDistribution(moodCounts, userJournals.length, 6),
    };
  } catch (error) {
    console.error('getMusicInsightsForUser failed:', error);
    throw new Error('Gagal menghitung statistik musik.', { cause: error });
  }
}
