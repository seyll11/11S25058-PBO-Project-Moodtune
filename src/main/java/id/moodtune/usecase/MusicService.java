package id.moodtune.usecase;

import id.moodtune.domain.exception.DomainNotFoundException;
import id.moodtune.domain.port.MusicPersistencePort;
import id.moodtune.model.MoodJournal;
import id.moodtune.model.Playlist;
import id.moodtune.model.PlaylistTrack;
import id.moodtune.model.Song;
import id.moodtune.usecase.dto.GeneratedPlaylistDraft;
import id.moodtune.usecase.port.TransactionBoundary;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class MusicService {
    private final MusicPersistencePort persistence;
    private final TransactionBoundary transactions;

    public MusicService(MusicPersistencePort persistence, TransactionBoundary transactions) {
        this.persistence = persistence;
        this.transactions = transactions;
    }

    public List<Song> songs() {
        return persistence.findSongsOrdered();
    }

    public Song song(long id) {
        return persistence.findSongById(id)
                .orElseThrow(() -> new DomainNotFoundException("Lagu tidak ditemukan."));
    }

    public Song saveSong(Song song) {
        return persistence.saveSong(song);
    }

    public void deleteSong(long id) {
        transactions.execute(() -> {
            Song song = song(id);
            List<MoodJournal> linkedJournals = persistence.findAllJournals().stream()
                    .filter(entry -> entry.getLinkedSong() != null && entry.getLinkedSong().getId().equals(id))
                    .toList();
            linkedJournals.forEach(entry -> entry.update(entry.getMoodLabel(), entry.getEnergyLevel(),
                    entry.getNote(), null, entry.getEntryDate()));
            persistence.saveJournals(linkedJournals);
            persistence.deleteTracksBySong(song);
            persistence.deleteSong(song);
        });
    }

    public List<Playlist> playlists() {
        return persistence.findPlaylistsOrdered();
    }

    public Playlist playlist(long id) {
        return persistence.findPlaylistById(id)
                .orElseThrow(() -> new DomainNotFoundException("Playlist tidak ditemukan."));
    }

    public Playlist savePlaylist(Playlist playlist) {
        return persistence.savePlaylist(playlist);
    }

    public Playlist saveGeneratedPlaylist(GeneratedPlaylistDraft draft) {
        return transactions.execute(() -> {
            Playlist playlist = persistence.savePlaylist(new Playlist(draft.name(), draft.description(),
                    draft.moodTag(), Playlist.validCover(draft.coverVariant())));
            List<PlaylistTrack> resolved = new ArrayList<>();
            HashSet<Long> included = new HashSet<>();
            for (GeneratedPlaylistDraft.Track track : draft.tracks()) {
                Song song = null;
                if ("library".equals(track.source()) && track.songId() != null) {
                    song = persistence.findSongById(track.songId()).orElse(null);
                }
                if (song == null) {
                    song = persistence.findSongByTitleAndArtist(track.title(), track.artist()).orElse(null);
                }
                if (song == null) {
                    song = persistence.saveSong(new Song(track.title(), track.artist(), track.genre(),
                            track.releaseYear(), track.reason()));
                }
                if (included.add(song.getId())) {
                    resolved.add(new PlaylistTrack(playlist.getId(), song, resolved.size()));
                }
            }
            persistence.saveTracks(resolved);
            return playlist;
        });
    }

    public void deletePlaylist(long id) {
        persistence.deletePlaylist(playlist(id));
    }

    public void addSong(long playlistId, long songId) {
        transactions.execute(() -> {
            Playlist playlist = playlist(playlistId);
            Song song = song(songId);
            if (!persistence.hasTrack(playlist, song)) {
                int position = persistence.findTracksByPlaylist(playlist).size();
                persistence.saveTrack(new PlaylistTrack(playlistId, song, position));
                playlist.touch();
                persistence.savePlaylist(playlist);
            }
        });
    }

    public void removeSong(long playlistId, long songId) {
        transactions.execute(() -> {
            Playlist playlist = playlist(playlistId);
            persistence.deleteTrack(playlist, song(songId));
            persistence.saveTracks(renumber(playlist));
            playlist.touch();
            persistence.savePlaylist(playlist);
        });
    }

    public void reorderSongs(long playlistId, List<Long> songIds) {
        transactions.execute(() -> {
            Playlist playlist = playlist(playlistId);
            List<PlaylistTrack> current = persistence.findTracksByPlaylist(playlist);
            Map<Long, PlaylistTrack> bySong = current.stream()
                    .collect(Collectors.toMap(track -> track.getSong().getId(), Function.identity()));
            if (songIds.size() != current.size() || songIds.stream().distinct().count() != current.size()
                    || !bySong.keySet().containsAll(songIds)) {
                throw new IllegalArgumentException("Urutan lagu tidak valid.");
            }
            for (int i = 0; i < songIds.size(); i++) {
                bySong.get(songIds.get(i)).setPosition(i);
            }
            persistence.saveTracks(current);
            playlist.touch();
            persistence.savePlaylist(playlist);
        });
    }

    public void moveSong(long playlistId, long songId, int direction) {
        transactions.execute(() -> {
            Playlist playlist = playlist(playlistId);
            List<PlaylistTrack> ordered = persistence.findTracksByPlaylist(playlist);
            int index = -1;
            for (int i = 0; i < ordered.size(); i++) {
                if (ordered.get(i).getSong().getId().equals(songId)) {
                    index = i;
                    break;
                }
            }
            int target = index + direction;
            if (index < 0 || target < 0 || target >= ordered.size()) return;
            int oldPosition = ordered.get(index).getPosition();
            ordered.get(index).setPosition(ordered.get(target).getPosition());
            ordered.get(target).setPosition(oldPosition);
            persistence.saveTracks(ordered);
            playlist.touch();
            persistence.savePlaylist(playlist);
        });
    }

    private List<PlaylistTrack> renumber(Playlist playlist) {
        List<PlaylistTrack> ordered = persistence.findTracksByPlaylist(playlist);
        for (int i = 0; i < ordered.size(); i++) ordered.get(i).setPosition(i);
        return ordered;
    }

    public List<MoodJournal> journals() {
        return persistence.findJournalsOrdered();
    }

    public MoodJournal journal(long id) {
        return persistence.findJournalById(id)
                .orElseThrow(() -> new DomainNotFoundException("Entri jurnal tidak ditemukan."));
    }

    public MoodJournal saveJournal(MoodJournal journal) {
        return persistence.saveJournal(journal);
    }

    public void deleteJournal(long id) {
        persistence.deleteJournal(journal(id));
    }

    public Map<String, Object> insights() {
        List<Song> allSongs = persistence.findAllSongs();
        List<Playlist> allPlaylists = persistence.findAllPlaylists();
        List<MoodJournal> allJournals = persistence.findAllJournals();
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        long thisMonth = persistence.findJournalsByDateRange(monthStart, monthStart.plusMonths(1)).size();

        Map<String, Long> genres = allSongs.stream()
                .collect(Collectors.groupingBy(song -> nonBlank(song.getGenre()), Collectors.counting()));
        Map<String, Long> moods = allJournals.stream()
                .collect(Collectors.groupingBy(entry -> nonBlank(entry.getMoodLabel()), Collectors.counting()));
        Map<String, Long> artists = allSongs.stream()
                .collect(Collectors.groupingBy(song -> nonBlank(song.getArtist()), Collectors.counting()));
        Map<String, Long> decades = allSongs.stream()
                .collect(Collectors.groupingBy(song -> (song.getReleaseYear() / 10 * 10) + "-an",
                        Collectors.counting()));
        Double averageEnergy = allJournals.isEmpty() ? null
                : Math.round(allJournals.stream().mapToInt(MoodJournal::getEnergyLevel).average().orElse(0) * 10.0)
                    / 10.0;

        Map<String, Object> result = new HashMap<>();
        result.put("totalSongs", allSongs.size());
        result.put("totalPlaylists", allPlaylists.size());
        result.put("uniqueArtists", allSongs.stream().map(song -> song.getArtist().toLowerCase()).distinct().count());
        result.put("totalJournalEntries", allJournals.size());
        result.put("entriesThisMonth", thisMonth);
        result.put("averageEnergy", averageEnergy == null ? "—" : averageEnergy);
        result.put("earliestYear", allSongs.stream().map(Song::getReleaseYear).min(Integer::compareTo).orElse(null));
        result.put("latestYear", allSongs.stream().map(Song::getReleaseYear).max(Integer::compareTo).orElse(null));
        result.put("genreBreakdown", top(genres, 6));
        result.put("moodBreakdown", top(moods, 6));
        result.put("topArtists", top(artists, 5));
        result.put("decadeBreakdown", decades.entrySet().stream().sorted(Map.Entry.comparingByKey()).toList());
        return result;
    }

    private String nonBlank(String value) {
        return value == null || value.isBlank() ? "Lainnya" : value.trim();
    }

    private List<Map.Entry<String, Long>> top(Map<String, Long> values, int limit) {
        return values.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(limit).toList();
    }
}
