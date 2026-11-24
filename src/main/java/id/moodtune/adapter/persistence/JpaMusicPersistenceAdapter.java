package id.moodtune.adapter.persistence;

import id.moodtune.adapter.persistence.entity.MoodJournalEntity;
import id.moodtune.adapter.persistence.entity.PlaylistEntity;
import id.moodtune.adapter.persistence.entity.PlaylistTrackEntity;
import id.moodtune.adapter.persistence.entity.SongEntity;
import id.moodtune.domain.exception.DomainNotFoundException;
import id.moodtune.domain.port.MusicPersistencePort;
import id.moodtune.model.MoodJournal;
import id.moodtune.model.Playlist;
import id.moodtune.model.PlaylistTrack;
import id.moodtune.model.Song;
import id.moodtune.adapter.persistence.repository.MoodJournalRepository;
import id.moodtune.adapter.persistence.repository.PlaylistRepository;
import id.moodtune.adapter.persistence.repository.PlaylistTrackRepository;
import id.moodtune.adapter.persistence.repository.SongRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class JpaMusicPersistenceAdapter implements MusicPersistencePort {
    private final SongRepository songs;
    private final PlaylistRepository playlists;
    private final PlaylistTrackRepository tracks;
    private final MoodJournalRepository journals;

    public JpaMusicPersistenceAdapter(SongRepository songs, PlaylistRepository playlists,
                                      PlaylistTrackRepository tracks, MoodJournalRepository journals) {
        this.songs = songs;
        this.playlists = playlists;
        this.tracks = tracks;
        this.journals = journals;
    }

    @Override
    public List<Song> findSongsOrdered() {
        return songs.findAllByOrderByCreatedAtDescIdDesc().stream().map(this::toDomain).toList();
    }

    @Override
    public List<Song> findAllSongs() {
        return songs.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<Song> findSongById(long id) {
        return songs.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<Song> findSongByTitleAndArtist(String title, String artist) {
        return songs.findFirstByTitleIgnoreCaseAndArtistIgnoreCase(title, artist).map(this::toDomain);
    }

    @Override
    public Song saveSong(Song song) {
        SongEntity entity = song.getId() == null
                ? SongEntity.create()
                : songs.findById(song.getId()).orElseThrow(() -> new DomainNotFoundException("Lagu tidak ditemukan."));
        entity.update(song.getTitle(), song.getArtist(), song.getGenre(), song.getReleaseYear(), song.getMoodNote());
        return toDomain(songs.save(entity));
    }

    @Override
    public void deleteSong(Song song) {
        SongEntity entity = songs.findById(song.getId())
                .orElseThrow(() -> new DomainNotFoundException("Lagu tidak ditemukan."));
        songs.delete(entity);
    }

    @Override
    public List<Playlist> findPlaylistsOrdered() {
        return playlists.findAllByOrderByUpdatedAtDescIdDesc().stream()
                .map(playlist -> toDomain(playlist, true)).toList();
    }

    @Override
    public List<Playlist> findAllPlaylists() {
        return playlists.findAll().stream().map(playlist -> toDomain(playlist, false)).toList();
    }

    @Override
    public Optional<Playlist> findPlaylistById(long id) {
        return playlists.findWithTracksById(id).map(playlist -> toDomain(playlist, true));
    }

    @Override
    public Playlist savePlaylist(Playlist playlist) {
        PlaylistEntity entity = playlist.getId() == null
                ? PlaylistEntity.create()
                : playlists.findWithTracksById(playlist.getId())
                    .orElseThrow(() -> new DomainNotFoundException("Playlist tidak ditemukan."));
        entity.update(playlist.getName(), playlist.getDescription(), playlist.getMoodTag(),
                playlist.getCoverVariant());
        return toDomain(playlists.save(entity), true);
    }

    @Override
    public void deletePlaylist(Playlist playlist) {
        PlaylistEntity entity = playlists.findById(playlist.getId())
                .orElseThrow(() -> new DomainNotFoundException("Playlist tidak ditemukan."));
        playlists.delete(entity);
    }

    @Override
    public List<PlaylistTrack> findTracksByPlaylist(Playlist playlist) {
        PlaylistEntity entity = playlists.findById(playlist.getId())
                .orElseThrow(() -> new DomainNotFoundException("Playlist tidak ditemukan."));
        return tracks.findAllByPlaylistOrderByPositionAscIdAsc(entity).stream()
                .map(track -> toDomain(track, playlist.getId())).toList();
    }

    @Override
    public boolean hasTrack(Playlist playlist, Song song) {
        PlaylistEntity playlistEntity = playlists.findById(playlist.getId())
                .orElseThrow(() -> new DomainNotFoundException("Playlist tidak ditemukan."));
        SongEntity songEntity = songs.findById(song.getId())
                .orElseThrow(() -> new DomainNotFoundException("Lagu tidak ditemukan."));
        return tracks.findByPlaylistAndSong(playlistEntity, songEntity).isPresent();
    }

    @Override
    public PlaylistTrack saveTrack(PlaylistTrack track) {
        PlaylistTrackEntity entity = track.getId() == null
                ? new PlaylistTrackEntity(requirePlaylist(track.getPlaylistId()), requireSong(track.getSong().getId()),
                        track.getPosition())
                : tracks.findById(track.getId())
                    .orElseThrow(() -> new DomainNotFoundException("Lagu dalam playlist tidak ditemukan."));
        entity.setPosition(track.getPosition());
        return toDomain(tracks.save(entity), track.getPlaylistId());
    }

    @Override
    public List<PlaylistTrack> saveTracks(List<PlaylistTrack> domainTracks) {
        List<PlaylistTrackEntity> entities = new ArrayList<>();
        for (PlaylistTrack track : domainTracks) {
            PlaylistTrackEntity entity = track.getId() == null
                    ? new PlaylistTrackEntity(requirePlaylist(track.getPlaylistId()),
                            requireSong(track.getSong().getId()), track.getPosition())
                    : tracks.findById(track.getId()).orElseThrow(
                            () -> new DomainNotFoundException("Lagu dalam playlist tidak ditemukan."));
            entity.setPosition(track.getPosition());
            entities.add(entity);
        }
        return tracks.saveAll(entities).stream()
                .map(track -> toDomain(track, track.getPlaylist().getId())).toList();
    }

    @Override
    public void deleteTrack(Playlist playlist, Song song) {
        PlaylistEntity playlistEntity = requirePlaylist(playlist.getId());
        SongEntity songEntity = requireSong(song.getId());
        tracks.deleteByPlaylistAndSong(playlistEntity, songEntity);
    }

    @Override
    public void deleteTracksBySong(Song song) {
        tracks.deleteAllBySong(requireSong(song.getId()));
    }

    @Override
    public List<MoodJournal> findJournalsOrdered() {
        return journals.findAllByOrderByEntryDateDescIdDesc().stream().map(this::toDomain).toList();
    }

    @Override
    public List<MoodJournal> findAllJournals() {
        return journals.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public List<MoodJournal> findJournalsByDateRange(LocalDate start, LocalDate end) {
        return journals.findAllByEntryDateGreaterThanEqualAndEntryDateLessThan(start, end)
                .stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<MoodJournal> findJournalById(long id) {
        return journals.findById(id).map(this::toDomain);
    }

    @Override
    public MoodJournal saveJournal(MoodJournal journal) {
        MoodJournalEntity entity = journal.getId() == null
                ? MoodJournalEntity.create()
                : journals.findById(journal.getId())
                    .orElseThrow(() -> new DomainNotFoundException("Entri jurnal tidak ditemukan."));
        SongEntity linkedSong = journal.getLinkedSong() == null
                ? null : requireSong(journal.getLinkedSong().getId());
        entity.update(journal.getMoodLabel(), journal.getEnergyLevel(), journal.getNote(),
                linkedSong, journal.getEntryDate());
        return toDomain(journals.save(entity));
    }

    @Override
    public List<MoodJournal> saveJournals(List<MoodJournal> domainJournals) {
        List<MoodJournalEntity> entities = new ArrayList<>();
        for (MoodJournal journal : domainJournals) {
            MoodJournalEntity entity = journal.getId() == null
                    ? MoodJournalEntity.create()
                    : journals.findById(journal.getId()).orElseThrow(
                            () -> new DomainNotFoundException("Entri jurnal tidak ditemukan."));
            SongEntity linkedSong = journal.getLinkedSong() == null
                    ? null : requireSong(journal.getLinkedSong().getId());
            entity.update(journal.getMoodLabel(), journal.getEnergyLevel(), journal.getNote(),
                    linkedSong, journal.getEntryDate());
            entities.add(entity);
        }
        return journals.saveAll(entities).stream().map(this::toDomain).toList();
    }

    @Override
    public void deleteJournal(MoodJournal journal) {
        MoodJournalEntity entity = journals.findById(journal.getId())
                .orElseThrow(() -> new DomainNotFoundException("Entri jurnal tidak ditemukan."));
        journals.delete(entity);
    }

    private PlaylistEntity requirePlaylist(Long id) {
        return playlists.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Playlist tidak ditemukan."));
    }

    private SongEntity requireSong(Long id) {
        return songs.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Lagu tidak ditemukan."));
    }

    private Song toDomain(SongEntity entity) {
        return new Song(entity.getId(), entity.getTitle(), entity.getArtist(), entity.getGenre(),
                entity.getReleaseYear(), entity.getMoodNote(), entity.getCreatedAt());
    }

    private Playlist toDomain(PlaylistEntity entity, boolean includeTracks) {
        List<PlaylistTrack> domainTracks = includeTracks
                ? entity.getTracks().stream().map(track -> toDomain(track, entity.getId())).toList()
                : List.of();
        return new Playlist(entity.getId(), entity.getName(), entity.getDescription(), entity.getMoodTag(),
                entity.getCoverVariant(), entity.getCreatedAt(), entity.getUpdatedAt(), domainTracks);
    }

    private PlaylistTrack toDomain(PlaylistTrackEntity entity, Long playlistId) {
        return new PlaylistTrack(entity.getId(), playlistId, toDomain(entity.getSong()),
                entity.getPosition(), entity.getAddedAt());
    }

    private MoodJournal toDomain(MoodJournalEntity entity) {
        return new MoodJournal(entity.getId(), entity.getMoodLabel(), entity.getEnergyLevel(), entity.getNote(),
                entity.getLinkedSong() == null ? null : toDomain(entity.getLinkedSong()), entity.getEntryDate(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
