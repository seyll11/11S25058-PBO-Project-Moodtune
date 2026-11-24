package id.moodtune.usecase;

import id.moodtune.domain.port.MusicPersistencePort;
import id.moodtune.model.Playlist;
import id.moodtune.model.PlaylistTrack;
import id.moodtune.model.Song;
import id.moodtune.usecase.port.TransactionBoundary;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MusicServiceTest {
    @Test
    void reordersTracksThroughThePersistencePort() {
        MusicPersistencePort persistence = mock(MusicPersistencePort.class);
        Playlist playlist = new Playlist(7L, "Focus", null, "focus", "focus", null, null, List.of());
        List<PlaylistTrack> tracks = List.of(
                new PlaylistTrack(1L, 7L, song(11L, "First"), 0, null),
                new PlaylistTrack(2L, 7L, song(22L, "Second"), 1, null));
        when(persistence.findPlaylistById(7L)).thenReturn(Optional.of(playlist));
        when(persistence.findTracksByPlaylist(playlist)).thenReturn(tracks);

        service(persistence).reorderSongs(7L, List.of(22L, 11L));

        verify(persistence).saveTracks(argThat(saved -> saved.size() == 2
                && saved.stream().anyMatch(track -> track.getSong().getId().equals(22L)
                        && track.getPosition() == 0)
                && saved.stream().anyMatch(track -> track.getSong().getId().equals(11L)
                        && track.getPosition() == 1)));
        verify(persistence).savePlaylist(playlist);
    }

    @Test
    void rejectsInvalidOrderBeforeWritingTracks() {
        MusicPersistencePort persistence = mock(MusicPersistencePort.class);
        Playlist playlist = new Playlist(7L, "Focus", null, "focus", "focus", null, null, List.of());
        when(persistence.findPlaylistById(7L)).thenReturn(Optional.of(playlist));
        when(persistence.findTracksByPlaylist(playlist)).thenReturn(
                List.of(new PlaylistTrack(1L, 7L, song(11L, "First"), 0, null)));

        assertThrows(IllegalArgumentException.class,
                () -> service(persistence).reorderSongs(7L, List.of(22L)));

        verify(persistence, never()).saveTracks(anyList());
    }

    private MusicService service(MusicPersistencePort persistence) {
        TransactionBoundary transactions = new TransactionBoundary() {
            @Override
            public <T> T execute(java.util.function.Supplier<T> operation) {
                return operation.get();
            }

            @Override
            public void execute(Runnable operation) {
                operation.run();
            }
        };
        return new MusicService(persistence, transactions);
    }

    private Song song(Long id, String title) {
        return new Song(id, title, "Artist", "Pop", 2024, null, null);
    }
}
