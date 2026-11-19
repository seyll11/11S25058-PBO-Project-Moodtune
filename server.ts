import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  addTracksToPlaylistForUser,
  createPlaylistForUser,
  createSongForUser,
  deletePlaylistForUser,
  deleteSongForUser,
  getPlaylistDetailForUser,
  listPlaylistsByUser,
  listSongsByUser,
  removeTrackFromPlaylistForUser,
  reorderPlaylistTracksForUser,
  saveGeneratedPlaylistForUser,
  updatePlaylistForUser,
  updateSongForUser,
} from './src/db/music.ts';
import {
  explainSongLyricsTheme,
  generatePlaylistDraft,
  recommendSongsByMood,
} from './src/services/gemini.ts';
import type { CoverVariant } from './src/types/music.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // Current authenticated user profile
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      res.json({ user: req.dbUser });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat profil pengguna.';
      res.status(500).json({ error: message });
    }
  });

  // Songs CRUD
  app.get('/api/songs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const items = await listSongsByUser(req.dbUser!.id);
      res.json({ songs: items });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat lagu.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/songs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, artist, genre, releaseYear, moodNote } = req.body || {};
      if (!title?.trim() || !artist?.trim() || !genre?.trim()) {
        res.status(400).json({ error: 'Judul, artis, dan genre wajib diisi.' });
        return;
      }
      const yearNum = Number(releaseYear);
      if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 2030) {
        res.status(400).json({ error: 'Tahun rilis harus berupa angka antara 1900 hingga 2030.' });
        return;
      }
      const song = await createSongForUser(req.dbUser!.id, {
        title: title.trim(),
        artist: artist.trim(),
        genre: genre.trim(),
        releaseYear: yearNum,
        moodNote: typeof moodNote === 'string' ? moodNote.trim() : null,
      });
      res.status(201).json({ song });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menambahkan lagu.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/songs/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const songId = Number(req.params.id);
      if (!Number.isInteger(songId)) {
        res.status(400).json({ error: 'ID lagu tidak valid.' });
        return;
      }
      const { title, artist, genre, releaseYear, moodNote } = req.body || {};
      let parsedYear: number | undefined;
      if (releaseYear !== undefined) {
        parsedYear = Number(releaseYear);
        if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2030) {
          res.status(400).json({ error: 'Tahun rilis tidak valid (1900–2030).' });
          return;
        }
      }
      const updated = await updateSongForUser(req.dbUser!.id, songId, {
        title: typeof title === 'string' ? title.trim() : undefined,
        artist: typeof artist === 'string' ? artist.trim() : undefined,
        genre: typeof genre === 'string' ? genre.trim() : undefined,
        releaseYear: parsedYear,
        moodNote:
          moodNote !== undefined
            ? typeof moodNote === 'string'
              ? moodNote.trim()
              : null
            : undefined,
      });
      if (!updated) {
        res.status(404).json({ error: 'Lagu tidak ditemukan.' });
        return;
      }
      res.json({ song: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui lagu.';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/songs/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const songId = Number(req.params.id);
      if (!Number.isInteger(songId)) {
        res.status(400).json({ error: 'ID lagu tidak valid.' });
        return;
      }
      const deleted = await deleteSongForUser(req.dbUser!.id, songId);
      if (!deleted) {
        res.status(404).json({ error: 'Lagu tidak ditemukan.' });
        return;
      }
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus lagu.';
      res.status(500).json({ error: message });
    }
  });

  // Playlists CRUD
  app.get('/api/playlists', requireAuth, async (req: AuthRequest, res) => {
    try {
      const items = await listPlaylistsByUser(req.dbUser!.id);
      res.json({ playlists: items });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat daftar playlist.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/playlists', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, description, moodTag, coverVariant } = req.body || {};
      if (!name?.trim()) {
        res.status(400).json({ error: 'Nama playlist wajib diisi.' });
        return;
      }
      const validVariant: CoverVariant =
        coverVariant === 'rain' || coverVariant === 'morning' ? coverVariant : 'focus';

      const playlist = await createPlaylistForUser(req.dbUser!.id, {
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : null,
        moodTag: typeof moodTag === 'string' ? moodTag.trim() : null,
        coverVariant: validVariant,
      });
      res.status(201).json({ playlist });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal membuat playlist.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/playlists/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const playlistId = Number(req.params.id);
      if (!Number.isInteger(playlistId)) {
        res.status(400).json({ error: 'ID playlist tidak valid.' });
        return;
      }
      const playlist = await getPlaylistDetailForUser(req.dbUser!.id, playlistId);
      if (!playlist) {
        res.status(404).json({ error: 'Playlist tidak ditemukan.' });
        return;
      }
      res.json({ playlist });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat detail playlist.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/playlists/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const playlistId = Number(req.params.id);
      if (!Number.isInteger(playlistId)) {
        res.status(400).json({ error: 'ID playlist tidak valid.' });
        return;
      }
      const { name, description, moodTag, coverVariant } = req.body || {};
      const updated = await updatePlaylistForUser(req.dbUser!.id, playlistId, {
        name: typeof name === 'string' ? name.trim() : undefined,
        description:
          description !== undefined
            ? typeof description === 'string'
              ? description.trim()
              : null
            : undefined,
        moodTag:
          moodTag !== undefined
            ? typeof moodTag === 'string'
              ? moodTag.trim()
              : null
            : undefined,
        coverVariant:
          coverVariant === 'focus' ||
          coverVariant === 'rain' ||
          coverVariant === 'morning'
            ? coverVariant
            : undefined,
      });
      if (!updated) {
        res.status(404).json({ error: 'Playlist tidak ditemukan.' });
        return;
      }
      const detail = await getPlaylistDetailForUser(req.dbUser!.id, playlistId);
      res.json({ playlist: detail });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memperbarui playlist.';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/playlists/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const playlistId = Number(req.params.id);
      if (!Number.isInteger(playlistId)) {
        res.status(400).json({ error: 'ID playlist tidak valid.' });
        return;
      }
      const deleted = await deletePlaylistForUser(req.dbUser!.id, playlistId);
      if (!deleted) {
        res.status(404).json({ error: 'Playlist tidak ditemukan.' });
        return;
      }
      res.json({ success: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal menghapus playlist.';
      res.status(500).json({ error: message });
    }
  });

  // Playlist-Song Relation endpoints
  app.post('/api/playlists/:id/tracks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const playlistId = Number(req.params.id);
      if (!Number.isInteger(playlistId)) {
        res.status(400).json({ error: 'ID playlist tidak valid.' });
        return;
      }
      const { songIds } = req.body || {};
      if (!Array.isArray(songIds)) {
        res.status(400).json({ error: 'Daftar ID lagu wajib disertakan.' });
        return;
      }
      const numericIds = songIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id));

      const detail = await addTracksToPlaylistForUser(
        req.dbUser!.id,
        playlistId,
        numericIds
      );
      if (!detail) {
        res.status(404).json({ error: 'Playlist tidak ditemukan.' });
        return;
      }
      res.json({ playlist: detail });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal menambahkan lagu ke playlist.';
      res.status(500).json({ error: message });
    }
  });

  app.patch(
    '/api/playlists/:id/tracks/reorder',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const playlistId = Number(req.params.id);
        if (!Number.isInteger(playlistId)) {
          res.status(400).json({ error: 'ID playlist tidak valid.' });
          return;
        }
        const { songIds } = req.body || {};
        if (!Array.isArray(songIds)) {
          res.status(400).json({ error: 'Urutan ID lagu tidak valid.' });
          return;
        }
        const orderedIds = songIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id));

        const detail = await reorderPlaylistTracksForUser(
          req.dbUser!.id,
          playlistId,
          orderedIds
        );
        if (!detail) {
          res.status(404).json({ error: 'Playlist tidak ditemukan.' });
          return;
        }
        res.json({ playlist: detail });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Gagal mengurutkan lagu.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.delete(
    '/api/playlists/:id/tracks/:songId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const playlistId = Number(req.params.id);
        const songId = Number(req.params.songId);
        if (!Number.isInteger(playlistId) || !Number.isInteger(songId)) {
          res.status(400).json({ error: 'ID playlist atau lagu tidak valid.' });
          return;
        }
        const detail = await removeTrackFromPlaylistForUser(
          req.dbUser!.id,
          playlistId,
          songId
        );
        if (!detail) {
          res.status(404).json({ error: 'Playlist tidak ditemukan.' });
          return;
        }
        res.json({ playlist: detail });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Gagal mengeluarkan lagu dari playlist.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Gemini AI endpoints
  app.post('/api/ai/recommend', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { mood } = req.body || {};
      if (!mood || typeof mood !== 'string' || !mood.trim()) {
        res.status(400).json({ error: 'Masukkan suasana hati atau aktivitas terlebih dahulu.' });
        return;
      }
      const userSongs = await listSongsByUser(req.dbUser!.id);
      const data = await recommendSongsByMood(mood.trim(), userSongs);
      res.json(data);
    } catch (error: unknown) {
      console.error('AI recommend error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal mendapatkan rekomendasi AI. Coba lagi sebentar.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/generate-playlist', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { theme, trackCount } = req.body || {};
      if (!theme || typeof theme !== 'string' || !theme.trim()) {
        res.status(400).json({ error: 'Masukkan tema atau aktivitas playlist.' });
        return;
      }
      const userSongs = await listSongsByUser(req.dbUser!.id);
      const draft = await generatePlaylistDraft(
        theme.trim(),
        Number(trackCount) || 6,
        userSongs
      );
      res.json({ draft });
    } catch (error: unknown) {
      console.error('AI generate playlist error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal menyusun playlist otomatis dengan AI.';
      res.status(500).json({ error: message });
    }
  });

  app.post(
    '/api/ai/save-generated-playlist',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const { name, description, moodTag, coverVariant, tracks } = req.body || {};
        if (!name?.trim() || !Array.isArray(tracks) || tracks.length === 0) {
          res.status(400).json({
            error: 'Nama playlist dan minimal satu lagu wajib tersedia untuk disimpan.',
          });
          return;
        }
        const validVariant: CoverVariant =
          coverVariant === 'rain' || coverVariant === 'morning'
            ? coverVariant
            : 'focus';

        const saved = await saveGeneratedPlaylistForUser(req.dbUser!.id, {
          name: name.trim(),
          description: typeof description === 'string' ? description : '',
          moodTag: typeof moodTag === 'string' ? moodTag : '',
          coverVariant: validVariant,
          tracks,
        });
        res.status(201).json({ playlist: saved });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Gagal menyimpan playlist ke database.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.post('/api/ai/explain-theme', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, artist, genre } = req.body || {};
      if (!title?.trim() || !artist?.trim()) {
        res.status(400).json({ error: 'Judul lagu dan nama artis wajib diisi.' });
        return;
      }
      const explanation = await explainSongLyricsTheme(
        title.trim(),
        artist.trim(),
        typeof genre === 'string' ? genre.trim() : undefined
      );
      res.json({ explanation });
    } catch (error: unknown) {
      console.error('AI explain theme error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal menganalisis tema lagu. Coba lagi.';
      res.status(500).json({ error: message });
    }
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MoodTune server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MoodTune server:', err);
  process.exit(1);
});
