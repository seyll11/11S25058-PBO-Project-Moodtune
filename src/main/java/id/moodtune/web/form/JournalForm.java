package id.moodtune.web.form;

import id.moodtune.model.MoodJournal;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public class JournalForm {
    @NotBlank(message = "Suasana hati wajib diisi.")
    @Size(max = 80)
    private String moodLabel;

    @Min(value = 1, message = "Energi minimal 1.")
    @Max(value = 5, message = "Energi maksimal 5.")
    private int energyLevel = 3;

    @NotBlank(message = "Catatan wajib diisi.")
    @Size(max = 2000)
    private String note;

    private Long linkedSongId;

    @NotNull(message = "Tanggal wajib diisi.")
    private LocalDate entryDate = LocalDate.now();

    public JournalForm() {
    }

    public JournalForm(MoodJournal journal) {
        moodLabel = journal.getMoodLabel();
        energyLevel = journal.getEnergyLevel();
        note = journal.getNote();
        linkedSongId = journal.getLinkedSong() == null ? null : journal.getLinkedSong().getId();
        entryDate = journal.getEntryDate();
    }

    public String getMoodLabel() { return moodLabel; }
    public void setMoodLabel(String moodLabel) { this.moodLabel = moodLabel; }
    public int getEnergyLevel() { return energyLevel; }
    public void setEnergyLevel(int energyLevel) { this.energyLevel = energyLevel; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Long getLinkedSongId() { return linkedSongId; }
    public void setLinkedSongId(Long linkedSongId) { this.linkedSongId = linkedSongId; }
    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }
}
