package id.moodtune.web.form;

import id.moodtune.model.Playlist;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PlaylistForm {
    @NotBlank(message = "Nama playlist wajib diisi.")
    @Size(max = 160)
    private String name;

    @Size(max = 1000)
    private String description;

    @Size(max = 80)
    private String moodTag;

    private String coverVariant = "focus";

    public PlaylistForm() {
    }

    public PlaylistForm(Playlist playlist) {
        name = playlist.getName();
        description = playlist.getDescription();
        moodTag = playlist.getMoodTag();
        coverVariant = playlist.getCoverVariant();
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getMoodTag() { return moodTag; }
    public void setMoodTag(String moodTag) { this.moodTag = moodTag; }
    public String getCoverVariant() { return coverVariant; }
    public void setCoverVariant(String coverVariant) { this.coverVariant = coverVariant; }
}
