import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const songs = pgTable('songs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  genre: text('genre').notNull(),
  releaseYear: integer('release_year').notNull(),
  moodNote: text('mood_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const playlists = pgTable('playlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  moodTag: text('mood_tag'),
  coverVariant: text('cover_variant').default('focus').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const playlistSongs = pgTable(
  'playlist_songs',
  {
    id: serial('id').primaryKey(),
    playlistId: integer('playlist_id')
      .references(() => playlists.id, { onDelete: 'cascade' })
      .notNull(),
    songId: integer('song_id')
      .references(() => songs.id, { onDelete: 'cascade' })
      .notNull(),
    position: integer('position').default(0).notNull(),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('playlist_songs_unique_idx').on(table.playlistId, table.songId),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  songs: many(songs),
  playlists: many(playlists),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  owner: one(users, {
    fields: [songs.userId],
    references: [users.id],
  }),
  playlistLinks: many(playlistSongs),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  owner: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
  tracks: many(playlistSongs),
}));

export const playlistSongsRelations = relations(playlistSongs, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistSongs.playlistId],
    references: [playlists.id],
  }),
  song: one(songs, {
    fields: [playlistSongs.songId],
    references: [songs.id],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type SongRow = typeof songs.$inferSelect;
export type PlaylistRow = typeof playlists.$inferSelect;
export type PlaylistSongRow = typeof playlistSongs.$inferSelect;
