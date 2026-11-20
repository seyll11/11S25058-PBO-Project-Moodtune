(() => {
  const panel = document.getElementById("youtube-player-panel");
  const frame = document.getElementById("youtube-player-frame");
  const title = document.getElementById("youtube-player-title");
  const closeButton = document.getElementById("youtube-player-close");
  if (!panel || !frame || !title || !closeButton) return;

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".youtube-play-button");
    if (!button) return;

    const videoId = button.dataset.videoId || "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;

    title.textContent = button.dataset.videoTitle || "Video YouTube";
    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  closeButton.addEventListener("click", () => {
    frame.removeAttribute("src");
    panel.hidden = true;
  });
})();
