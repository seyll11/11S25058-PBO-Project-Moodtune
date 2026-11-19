package id.moodtune.service;

import id.moodtune.model.MoodJournal;
import id.moodtune.model.Playlist;
import id.moodtune.model.PlaylistTrack;
import id.moodtune.model.Song;
import id.moodtune.service.GeneratedPlaylistDraft;
import id.moodtune.repository.MoodJournalRepository;
import id.moodtune.repository.PlaylistRepository;
import id.moodtune.repository.PlaylistTrackRepository;
import id.moodtune.repository.SongRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MusicService {
    private final SongRepository songs;
    private final PlaylistRepository playlists;
    private final PlaylistTrackRepository tracks;
    private final MoodJournalRepository journals;

    public MusicService(SongRepository songs, PlaylistRepository playlists,
                        PlaylistTrackRepository tracks, MoodJournalRepository journals) {
        this.songs = songs;
        this.playlists = playlists;
        this.tracks = tracks;
        this.journals = journals;
    }

    public List<Song> songs() {
        return songs.findAllByOrderByCreatedAtDescIdDesc();
    }

    public Song song(long id) {
        return songs.findById(id).orElseThrow(() -> new EntityNotFoundException("Lagu tidak ditemukan."));
    }

    public Song saveSong(Song song) {
        return songs.save(song);
    }

    @Transactional
    public void deleteSong(long id) {
        Song song = song(id);
        journals.findAll().stream()
                .filter(entry -> entry.getLinkedSong() != null && entry.getLinkedSong().getId().equals(id))
                .forEach(entry -> entry.update(entry.getMoodLabel(), entry.getEnergyLevel(), entry.getNote(), null,
                        entry.getEntryDate()));
        tracks.deleteAllBySong(song);
        songs.delete(song);
    }

    public List<Playlist> playlists() {
        return playlists.findAllByOrderByUpdatedAtDescIdDesc();
    }

    public Playlist playlist(long id) {
        return playlists.findWithTracksById(id)
                .orElseThrow(() -> new EntityNotFoundException("Playlist tidak ditemukan."));
    }

    public Playlist savePlaylist(Playlist playlist) {
        return playlists.save(playlist);
    }

    @Transactional
    public Playlist saveGeneratedPlaylist(GeneratedPlaylistDraft draft) {
        Playlist playlist = playlists.save(new Playlist(draft.name(), draft.description(),
                draft.moodTag(), Playlist.validCover(draft.coverVariant())));
        List<PlaylistTrack> resolved = new java.util.ArrayList<>();
        java.util.Set<Long> included = new java.util.HashSet<>();
        for (GeneratedPlaylistDraft.Track track : draft.tracks()) {
            Song song = null;
            if ("library".equals(track.source()) && track.songId() != null) {
                song = songs.findById(track.songId()).orElse(null);
            }
            if (song == null) {
                song = songs.findFirstByTitleIgnoreCaseAndArtistIgnoreCase(track.title(), track.artist()).orElse(null);
            }
            if (song == null) {
                song = songs.save(new Song(track.title(), track.artist(), track.genre(),
                        track.releaseYear(), track.reason()));
            }
            if (included.add(song.getId())) {
                resolved.add(new PlaylistTrack(playlist, song, resolved.size()));
            }
        }
        tracks.saveAll(resolved);
        return playlist;
    }

    public void deletePlaylist(long id) {
        playlists.delete(playlist(id));
    }

    @Transactional
    public void addSong(long playlistId, long songId) {
        Playlist playlist = playlist(playlistId);
        Song song = song(songId);
        if (tracks.findByPlaylistAndSong(playlist, song).isEmpty()) {
            int position = tracks.findAllByPlaylistOrderByPositionAscIdAsc(playlist).size();
            tracks.save(new PlaylistTrack(playlist, song, position));
            playlist.touch();
        }
    }

    @Transactional
    public void removeSong(long playlistId, long songId) {
        Playlist playlist = playlist(playlistId);
        tracks.deleteByPlaylistAndSong(playlist, song(songId));
        renumber(playlist);
        playlist.touch();
    }

    @Transactional
    public void reorderSongs(long playlistId, List<Long> songIds) {
        Playlist playlist = playlist(playlistId);
        List<PlaylistTrack> current = tracks.findAllByPlaylistOrderByPositionAscIdAsc(playlist);
        Map<Long, PlaylistTrack> bySong = current.stream()
                .collect(Collectors.toMap(track -> track.getSong().getId(), Function.identity()));
        if (songIds.size() != current.size() || songIds.stream().distinct().count() != current.size()
                || !bySong.keySet().containsAll(songIds)) {
            throw new IllegalArgumentException("Urutan lagu tidak valid.");
        }
        for (int i = 0; i < songIds.size(); i++) {
            bySong.get(songIds.get(i)).setPosition(i);
        }
        playlist.touch();
    }

    @Transactional
    public void moveSong(long playlistId, long songId, int direction) {
        Playlist playlist = playlist(playlistId);
        List<PlaylistTrack> ordered = tracks.findAllByPlaylistOrderByPositionAscIdAsc(playlist);
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
        playlist.touch();
    }

    private void renumber(Playlist playlist) {
        List<PlaylistTrack> ordered = tracks.findAllByPlaylistOrderByPositionAscIdAsc(playlist);
        for (int i = 0; i < ordered.size(); i++) ordered.get(i).setPosition(i);
    }

    public List<MoodJournal> journals() {
        return journals.findAllByOrderByEntryDateDescIdDesc();
    }

    public MoodJournal journal(long id) {
        return journals.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Entri jurnal tidak ditemukan."));
    }

    public MoodJournal saveJournal(MoodJournal journal) {
        return journals.save(journal);
    }

    public void deleteJournal(long id) {
        journals.delete(journal(id));
    }

    public Map<String, Object> insights() {
        List<Song> allSongs = songs.findAll();
        List<Playlist> allPlaylists = playlists.findAll();
        List<MoodJournal> allJournals = journals.findAll();
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        long thisMonth = journals.findAllByEntryDateGreaterThanEqualAndEntryDateLessThan(
                monthStart, monthStart.plusMonths(1)).size();

        Map<String, Long> genres = allSongs.stream()
                .collect(Collectors.groupingBy(song -> nonBlank(song.getGenre()), Collectors.counting()));
        Map<String, Long> moods = allJournals.stream()
                .collect(Collectors.groupingBy(entry -> nonBlank(entry.getMoodLabel()), Collectors.counting()));
        Map<String, Long> artists = allSongs.stream()
                .collect(Collectors.groupingBy(song -> nonBlank(song.getArtist()), Collectors.counting()));
        Map<String, Long> decades = allSongs.stream()
                .collect(Collectors.groupingBy(song -> (song.getReleaseYear() / 10 * 10) + "-an", Collectors.counting()));
        Double averageEnergy = allJournals.isEmpty() ? null
                : Math.round(allJournals.stream().mapToInt(MoodJournal::getEnergyLevel).average().orElse(0) * 10.0) / 10.0;

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
