document.addEventListener("DOMContentLoaded", () => {
  const player = document.getElementById("soundscape-player");
  if (!player) return;

  const toggle = document.getElementById("soundscape-toggle");
  const volumeControl = document.getElementById("soundscape-volume");
  const chordLabel = document.getElementById("soundscape-chord");
  const errorLabel = document.getElementById("soundscape-error");
  const blueprint = JSON.parse(player.dataset.blueprint);
  let context = null;
  let masterGain = null;
  let timer = null;
  let playing = false;
  let step = 0;
  let chordIndex = 0;

  function playChord(frequencies, duration) {
    const now = context.currentTime;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(blueprint.waveform === "warm-pad" ? 900 : 1400, now);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(0.16, now + 0.35);
    envelope.gain.setValueAtTime(0.14, now + Math.max(0.4, duration - 0.5));
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.25);
    filter.connect(envelope);
    envelope.connect(masterGain);
    frequencies.slice(0, 4).forEach((frequency) => {
      if (!Number.isFinite(frequency) || frequency < 35 || frequency > 2000) return;
      const oscillator = context.createOscillator();
      oscillator.type = blueprint.waveform === "triangle" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.connect(filter);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.3);
    });
  }

  function playNote(frequency, duration) {
    if (!Number.isFinite(frequency) || frequency < 60 || frequency > 3000) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = blueprint.waveform === "sine" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(0.12, now + 0.04);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  function tick() {
    if (!playing || !context || !masterGain || !blueprint.chords.length) return;
    const chord = blueprint.chords[chordIndex % blueprint.chords.length];
    const stepInBar = step % 4;
    const stepSeconds = 60 / blueprint.bpm;
    if (stepInBar === 0) {
      playChord(chord.frequencies, stepSeconds * 4);
      chordLabel.textContent = chord.name || blueprint.scaleName;
    }
    if (chord.melodyFrequencies.length) {
      playNote(chord.melodyFrequencies[stepInBar % chord.melodyFrequencies.length], stepSeconds * 1.4);
    }
    step += 1;
    if (step % 4 === 0) chordIndex = (chordIndex + 1) % blueprint.chords.length;
  }

  async function stop() {
    playing = false;
    window.clearInterval(timer);
    timer = null;
    if (context) {
      const closingContext = context;
      context = null;
      masterGain = null;
      await closingContext.close();
    }
    toggle.textContent = "▶ Putar";
  }

  toggle.addEventListener("click", async () => {
    errorLabel.textContent = "";
    if (playing) {
      await stop();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Browser ini tidak mendukung Web Audio API.");
      context = new AudioContext();
      await context.resume();
      masterGain = context.createGain();
      masterGain.gain.value = Number(volumeControl.value) * 0.55;
      masterGain.connect(context.destination);
      step = 0;
      chordIndex = 0;
      playing = true;
      toggle.textContent = "■ Hentikan";
      tick();
      timer = window.setInterval(tick, Math.round(60000 / blueprint.bpm));
    } catch (error) {
      await stop();
      errorLabel.textContent = error instanceof Error ? error.message : "Audio tidak dapat diputar.";
    }
  });

  volumeControl.addEventListener("input", () => {
    if (masterGain && context) {
      masterGain.gain.setTargetAtTime(Number(volumeControl.value) * 0.55, context.currentTime, 0.05);
    }
  });
  window.addEventListener("pagehide", () => { void stop(); });
});
