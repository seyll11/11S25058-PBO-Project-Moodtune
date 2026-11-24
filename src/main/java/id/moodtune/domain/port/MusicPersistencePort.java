package id.moodtune.domain.port;

import id.moodtune.model.MoodJournal;
import id.moodtune.model.Playlist;
import id.moodtune.model.PlaylistTrack;
import id.moodtune.model.Song;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MusicPersistencePort {
    List<Song> findSongsOrdered();
    List<Song> findAllSongs();
    Optional<Song> findSongById(long id);
    Optional<Song> findSongByTitleAndArtist(String title, String artist);
    Song saveSong(Song song);
    void deleteSong(Song song);

    List<Playlist> findPlaylistsOrdered();
    List<Playlist> findAllPlaylists();
    Optional<Playlist> findPlaylistById(long id);
    Playlist savePlaylist(Playlist playlist);
    void deletePlaylist(Playlist playlist);

    List<PlaylistTrack> findTracksByPlaylist(Playlist playlist);
    boolean hasTrack(Playlist playlist, Song song);
    PlaylistTrack saveTrack(PlaylistTrack track);
    List<PlaylistTrack> saveTracks(List<PlaylistTrack> tracks);
    void deleteTrack(Playlist playlist, Song song);
    void deleteTracksBySong(Song song);

    List<MoodJournal> findJournalsOrdered();
    List<MoodJournal> findAllJournals();
    List<MoodJournal> findJournalsByDateRange(LocalDate start, LocalDate end);
    Optional<MoodJournal> findJournalById(long id);
    MoodJournal saveJournal(MoodJournal journal);
    List<MoodJournal> saveJournals(List<MoodJournal> journals);
    void deleteJournal(MoodJournal journal);
}
