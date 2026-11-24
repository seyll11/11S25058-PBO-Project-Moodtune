package id.moodtune.usecase.port;

import id.moodtune.model.Song;
import id.moodtune.usecase.dto.GeneratedPlaylistDraft;
import id.moodtune.usecase.dto.SoundscapeBlueprint;
import java.util.List;

public interface MusicAiPort {
    String answer(String mode, String prompt, List<Song> songs);
    GeneratedPlaylistDraft generatePlaylistDraft(String prompt, int requestedCount, List<Song> songs);
    SoundscapeBlueprint composeSoundscape(String prompt);
}
