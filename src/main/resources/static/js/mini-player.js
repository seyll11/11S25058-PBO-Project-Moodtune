(() => {
  const player = document.getElementById("mini-player");
  const title = document.getElementById("mini-player-title");
  const artist = document.getElementById("mini-player-artist");
  const status = document.getElementById("mini-player-status");
  const closeButton = document.getElementById("mini-player-close");
  const audioWrap = document.getElementById("mini-player-audio-wrap");
  const audio = document.getElementById("mini-player-audio");
  const videoWrap = document.getElementById("mini-player-video-wrap");
  const video = document.getElementById("mini-player-video");
  if (!player || !title || !artist || !status || !closeButton || !audioWrap || !audio || !videoWrap || !video) return;

  const storageKey = "moodtune.mini-player";
  const validVideoId = (id) => /^[A-Za-z0-9_-]{11}$/.test(id || "");
  const showPlayer = () => {
    player.hidden = false;
    document.documentElement.classList.add("has-mini-player");
  };
  const save = (state) => sessionStorage.setItem(storageKey, JSON.stringify(state));
  const setTrackInfo = (trackTitle, trackArtist) => {
    title.textContent = trackTitle || "MoodTune";
    artist.textContent = trackArtist || "";
    status.textContent = "";
    showPlayer();
  };
  const playAudio = (url, trackTitle, trackArtist) => {
    if (!url || !/^https:\/\//i.test(url)) return;
    video.removeAttribute("src");
    videoWrap.hidden = true;
    audioWrap.hidden = false;
    document.documentElement.classList.remove("has-mini-video");
    setTrackInfo(trackTitle, trackArtist);
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    save({ type: "audio", url, title: trackTitle || "", artist: trackArtist || "", time: 0 });
    audio.play().catch(() => {
      status.textContent = "Tekan tombol putar pada kontrol audio untuk memulai.";
    });
  };
  const playVideo = (id, trackTitle) => {
    if (!validVideoId(id)) return;
    audio.pause();
    audio.removeAttribute("src");
    audioWrap.hidden = true;
    videoWrap.hidden = false;
    document.documentElement.classList.add("has-mini-video");
    setTrackInfo(trackTitle || "Video YouTube", "YouTube");
    video.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    save({ type: "video", id, title: trackTitle || "Video YouTube" });
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const audioButton = event.target.closest(".mini-audio-play");
    if (audioButton) {
      playAudio(audioButton.dataset.audioUrl, audioButton.dataset.trackTitle, audioButton.dataset.trackArtist);
      return;
    }
    const videoButton = event.target.closest(".youtube-play-button");
    if (videoButton) {
      playVideo(videoButton.dataset.videoId, videoButton.dataset.videoTitle);
    }
  });

  audio.addEventListener("timeupdate", () => {
    try {
      const current = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (current && current.type === "audio") {
        current.time = audio.currentTime;
        save(current);
      }
    } catch (error) {
      sessionStorage.removeItem(storageKey);
    }
  });

  audio.addEventListener("play", () => { status.textContent = ""; });
  audio.addEventListener("error", () => {
    status.textContent = "Pratinjau audio tidak dapat diputar. Coba pilih versi YouTube.";
  });

  closeButton.addEventListener("click", () => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    video.removeAttribute("src");
    player.hidden = true;
    audioWrap.hidden = true;
    videoWrap.hidden = true;
    document.documentElement.classList.remove("has-mini-player", "has-mini-video");
    sessionStorage.removeItem(storageKey);
  });

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (saved && saved.type === "audio" && /^https:\/\//i.test(saved.url)) {
      audio.src = saved.url;
      audio.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(saved.time) && saved.time > 0) audio.currentTime = saved.time;
      }, { once: true });
      audioWrap.hidden = false;
      videoWrap.hidden = true;
      setTrackInfo(saved.title, saved.artist);
      status.textContent = "Posisi terakhir disimpan; tekan putar untuk melanjutkan.";
    } else if (saved && saved.type === "video" && validVideoId(saved.id)) {
      video.src = `https://www.youtube-nocookie.com/embed/${saved.id}?autoplay=0&rel=0`;
      audioWrap.hidden = true;
      videoWrap.hidden = false;
      document.documentElement.classList.add("has-mini-video");
      setTrackInfo(saved.title, "YouTube · pilih putar untuk melanjutkan");
    }
  } catch (error) {
    sessionStorage.removeItem(storageKey);
  }
})();
