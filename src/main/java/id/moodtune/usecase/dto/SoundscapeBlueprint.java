package id.moodtune.usecase.dto;

import java.util.List;

public record SoundscapeBlueprint(
        String title,
        String moodDescription,
        int bpm,
        String waveform,
        String scaleName,
        List<Chord> chords
) {
    public record Chord(String name, List<Double> frequencies, List<Double> melodyFrequencies) {
    }
}
