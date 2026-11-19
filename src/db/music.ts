import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { playlists, playlistSongs, songs } from './schema.ts';
import type { CoverVariant } from '../types/music.ts';

export interface CreateSongInput {
  title: string;
  artist: string;
  genre: string;
  releaseYear: number;
  moodNote?: string | null;
}

export interface UpdateSongInput {
  title?: string;
  artist?: string;
  genre?: string;
  releaseYear?: number;
  moodNote?: string | null;
}

export interface CreatePlaylistInput {
  name: string;
  description?: string | null;
  moodTag?: string | null;
  coverVariant?: CoverVariant;
}

export interface UpdatePlaylistInput {
  name?: string;
  description?: string | null;
  moodTag?: string | null;
  coverVariant?: CoverVariant;
}

export async function listSongsByUser(userId: number) {
  try {
    return await db
      .select()
      .from(songs)
      .where(eq(songs.userId, userId))
      .orderBy(desc(songs.createdAt), desc(songs.id));
  } catch (error) {
    console.error('listSongsByUser failed:', error);
    throw new Error('Gagal memuat koleksi lagu.', { cause: error });
  }
}

export async function createSongForUser(userId: number, input: CreateSongInput) {
  try {
    const [created] = await db
      .insert(songs)
      .values({
        userId,
        title: input.title,
        artist: input.artist,
        genre: input.genre,
        releaseYear: input.releaseYear,
        moodNote: input.moodNote || null,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('createSongForUser failed:', error);
    throw new Error('Gagal menyimpan lagu baru.', { cause: error });
  }
}

export async function updateSongForUser(
  userId: number,
  songId: number,
  input: UpdateSongInput
) {
  try {
    const [updated] = await db
      .update(songs)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.artist !== undefined ? { artist: input.artist } : {}),
        ...(input.genre !== undefined ? { genre: input.genre } : {}),
        ...(input.releaseYear !== undefined ? { releaseYear: input.releaseYear } : {}),
        ...(input.moodNote !== undefined ? { moodNote: input.moodNote || null } : {}),
      })
      .where(and(eq(songs.id, songId), eq(songs.userId, userId)))
      .returning();

    return updated ?? null;
  } catch (error) {
    console.error('updateSongForUser failed:', error);
    throw new Error('Gagal memperbarui data lagu.', { cause: error });
  }
}

export async function deleteSongForUser(userId: number, songId: number) {
  try {
    const deleted = await db
      .delete(songs)
      .where(and(eq(songs.id, songId), eq(songs.userId, userId)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('deleteSongForUser failed:', error);
    throw new Error('Gagal menghapus lagu.', { cause: error });
  }
}

export async function listPlaylistsByUser(userId: number) {
  try {
    const rows = await db
      .select({
        id: playlists.id,
        userId: playlists.userId,
        name: playlists.name,
        description: playlists.description,
        moodTag: playlists.moodTag,
        coverVariant: playlists.coverVariant,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
        trackCount: sql<number>`cast(count(${playlistSongs.id}) as int)`,
      })
      .from(playlists)
      .leftJoin(playlistSongs, eq(playlists.id, playlistSongs.playlistId))
      .where(eq(playlists.userId, userId))
      .groupBy(playlists.id)
      .orderBy(desc(playlists.updatedAt), desc(playlists.id));

    return rows;
  } catch (error) {
    console.error('listPlaylistsByUser failed:', error);
    throw new Error('Gagal memuat daftar playlist.', { cause: error });
  }
}

export async function getPlaylistDetailForUser(
  userId: number,
  playlistId: number
) {
  try {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

    if (!playlist) return null;

    const tracks = await db
      .select({
        id: songs.id,
        userId: songs.userId,
        title: songs.title,
        artist: songs.artist,
        genre: songs.genre,
        releaseYear: songs.releaseYear,
        moodNote: songs.moodNote,
        createdAt: songs.createdAt,
        position: playlistSongs.position,
        addedAt: playlistSongs.addedAt,
      })
      .from(playlistSongs)
      .innerJoin(songs, eq(playlistSongs.songId, songs.id))
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(asc(playlistSongs.position), asc(playlistSongs.id));

    return {
      ...playlist,
      trackCount: tracks.length,
      tracks,
    };
  } catch (error) {
    console.error('getPlaylistDetailForUser failed:', error);
    throw new Error('Gagal memuat detail playlist.', { cause: error });
  }
}

export async function createPlaylistForUser(
  userId: number,
  input: CreatePlaylistInput
) {
  try {
    const [created] = await db
      .insert(playlists)
      .values({
        userId,
        name: input.name,
        description: input.description || null,
        moodTag: input.moodTag || null,
        coverVariant: input.coverVariant || 'focus',
      })
      .returning();

    return {
      ...created,
      trackCount: 0,
    };
  } catch (error) {
    console.error('createPlaylistForUser failed:', error);
    throw new Error('Gagal membuat playlist baru.', { cause: error });
  }
}

export async function updatePlaylistForUser(
  userId: number,
  playlistId: number,
  input: UpdatePlaylistInput
) {
  try {
    const [updated] = await db
      .update(playlists)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description || null }
          : {}),
        ...(input.moodTag !== undefined ? { moodTag: input.moodTag || null } : {}),
        ...(input.coverVariant !== undefined
          ? { coverVariant: input.coverVariant }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .returning();

    return updated ?? null;
  } catch (error) {
    console.error('updatePlaylistForUser failed:', error);
    throw new Error('Gagal memperbarui playlist.', { cause: error });
  }
}

export async function deletePlaylistForUser(userId: number, playlistId: number) {
  try {
    const deleted = await db
      .delete(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('deletePlaylistForUser failed:', error);
    throw new Error('Gagal menghapus playlist.', { cause: error });
  }
}

export async function addTracksToPlaylistForUser(
  userId: number,
  playlistId: number,
  songIds: number[]
) {
  try {
    if (songIds.length === 0) {
      return await getPlaylistDetailForUser(userId, playlistId);
    }

    const [playlist] = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

    if (!playlist) return null;

    const validSongs = await db
      .select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.userId, userId), inArray(songs.id, songIds)));

    const validIds = validSongs.map((s) => s.id);
    if (validIds.length === 0) {
      return await getPlaylistDetailForUser(userId, playlistId);
    }

    const existingLinks = await db
      .select({ songId: playlistSongs.songId, position: playlistSongs.position })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId));

    const existingSet = new Set(existingLinks.map((l) => l.songId));
    let maxPos = existingLinks.reduce((max, l) => Math.max(max, l.position), -1);

    const toInsert = validIds
      .filter((id) => !existingSet.has(id))
      .map((songId) => {
        maxPos += 1;
        return {
          playlistId,
          songId,
          position: maxPos,
        };
      });

    if (toInsert.length > 0) {
      await db.insert(playlistSongs).values(toInsert).onConflictDoNothing();
      await db
        .update(playlists)
        .set({ updatedAt: new Date() })
        .where(eq(playlists.id, playlistId));
    }

    return await getPlaylistDetailForUser(userId, playlistId);
  } catch (error) {
    console.error('addTracksToPlaylistForUser failed:', error);
    throw new Error('Gagal menambahkan lagu ke playlist.', { cause: error });
  }
}

export async function removeTrackFromPlaylistForUser(
  userId: number,
  playlistId: number,
  songId: number
) {
  try {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

    if (!playlist) return null;

    await db
      .delete(playlistSongs)
      .where(
        and(
          eq(playlistSongs.playlistId, playlistId),
          eq(playlistSongs.songId, songId)
        )
      );

    await db
      .update(playlists)
      .set({ updatedAt: new Date() })
      .where(eq(playlists.id, playlistId));

    return await getPlaylistDetailForUser(userId, playlistId);
  } catch (error) {
    console.error('removeTrackFromPlaylistForUser failed:', error);
    throw new Error('Gagal menghapus lagu dari playlist.', { cause: error });
  }
}

export async function reorderPlaylistTracksForUser(
  userId: number,
  playlistId: number,
  orderedSongIds: number[]
) {
  try {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

    if (!playlist) return null;

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedSongIds.length; i++) {
        await tx
          .update(playlistSongs)
          .set({ position: i })
          .where(
            and(
              eq(playlistSongs.playlistId, playlistId),
              eq(playlistSongs.songId, orderedSongIds[i])
            )
          );
      }
      await tx
        .update(playlists)
        .set({ updatedAt: new Date() })
        .where(eq(playlists.id, playlistId));
    });

    return await getPlaylistDetailForUser(userId, playlistId);
  } catch (error) {
    console.error('reorderPlaylistTracksForUser failed:', error);
    throw new Error('Gagal mengubah urutan lagu dalam playlist.', { cause: error });
  }
}

export interface SaveGeneratedPlaylistInput {
  name: string;
  description: string;
  moodTag: string;
  coverVariant: CoverVariant;
  tracks: Array<{
    songId: number | null;
    title: string;
    artist: string;
    genre: string;
    releaseYear: number;
    reason?: string;
  }>;
}

export async function saveGeneratedPlaylistForUser(
  userId: number,
  input: SaveGeneratedPlaylistInput
) {
  try {
    const createdPlaylistId = await db.transaction(async (tx) => {
      const existingSongs = await tx
        .select()
        .from(songs)
        .where(eq(songs.userId, userId));

      const keyMap = new Map<string, number>();
      const validIds = new Set<number>();
      for (const s of existingSongs) {
        validIds.add(s.id);
        keyMap.set(
          `${s.title.trim().toLowerCase()}::${s.artist.trim().toLowerCase()}`,
          s.id
        );
      }

      const resolvedSongIds: number[] = [];

      for (const track of input.tracks) {
        if (track.songId && validIds.has(track.songId)) {
          if (!resolvedSongIds.includes(track.songId)) {
            resolvedSongIds.push(track.songId);
          }
          continue;
        }

        const key = `${track.title.trim().toLowerCase()}::${track.artist
          .trim()
          .toLowerCase()}`;
        const existingId = keyMap.get(key);
        if (existingId) {
          if (!resolvedSongIds.includes(existingId)) {
            resolvedSongIds.push(existingId);
          }
          continue;
        }

        const [insertedSong] = await tx
          .insert(songs)
          .values({
            userId,
            title: track.title.trim(),
            artist: track.artist.trim(),
            genre: track.genre.trim() || 'Pop',
            releaseYear: track.releaseYear || new Date().getFullYear(),
            moodNote: track.reason || input.moodTag || null,
          })
          .returning();

        keyMap.set(key, insertedSong.id);
        validIds.add(insertedSong.id);
        resolvedSongIds.push(insertedSong.id);
      }

      const [newPlaylist] = await tx
        .insert(playlists)
        .values({
          userId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          moodTag: input.moodTag?.trim() || null,
          coverVariant: input.coverVariant || 'focus',
        })
        .returning();

      if (resolvedSongIds.length > 0) {
        await tx.insert(playlistSongs).values(
          resolvedSongIds.map((songId, index) => ({
            playlistId: newPlaylist.id,
            songId,
            position: index,
          }))
        );
      }

      return newPlaylist.id;
    });

    return await getPlaylistDetailForUser(userId, createdPlaylistId);
  } catch (error) {
    console.error('saveGeneratedPlaylistForUser failed:', error);
    throw new Error('Gagal menyimpan playlist hasil kurasi AI.', { cause: error });
  }
}
