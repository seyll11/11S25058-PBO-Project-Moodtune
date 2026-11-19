package id.moodtune.web.form;

import id.moodtune.model.Song;
import jakarta.validation.constraints.*;

public class SongForm {
    @NotBlank(message = "Judul wajib diisi.")
    @Size(max = 160)
    private String title;

    @NotBlank(message = "Nama artis wajib diisi.")
    @Size(max = 160)
    private String artist;

    @NotBlank(message = "Genre wajib diisi.")
    @Size(max = 80)
    private String genre;

    @NotNull(message = "Tahun rilis wajib diisi.")
    @Min(value = 1900, message = "Tahun rilis minimal 1900.")
    @Max(value = 2030, message = "Tahun rilis maksimal 2030.")
    private Integer releaseYear;

    @Size(max = 500, message = "Catatan maksimal 500 karakter.")
    private String moodNote;

    public SongForm() {
        releaseYear = java.time.Year.now().getValue();
    }

    public SongForm(Song song) {
        title = song.getTitle();
        artist = song.getArtist();
        genre = song.getGenre();
        releaseYear = song.getReleaseYear();
        moodNote = song.getMoodNote();
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public Integer getReleaseYear() { return releaseYear; }
    public void setReleaseYear(Integer releaseYear) { this.releaseYear = releaseYear; }
    public String getMoodNote() { return moodNote; }
    public void setMoodNote(String moodNote) { this.moodNote = moodNote; }
}
