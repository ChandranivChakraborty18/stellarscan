// ============================================================
// audio.js
// ============================================================
// Handles the ambient background music toggle button.
//
// IMPORTANT: Browsers block audio from auto-playing until the
// user interacts with the page (like clicking a button). This
// is a browser security rule, not a bug in this code — so we
// always start muted, and only play after a real click.

(function () {

  const audio = document.getElementById("bgMusic");
  const toggleBtn = document.getElementById("soundToggle");

  if (!audio || !toggleBtn) return;

  let isPlaying = false;

  toggleBtn.addEventListener("click", function () {
    if (isPlaying) {
      audio.pause();
      toggleBtn.textContent = "🔇";
      toggleBtn.classList.remove("on");
      isPlaying = false;
    } else {
      // .play() returns a Promise; if the audio file is missing
      // or blocked, we catch the error instead of crashing.
      audio.volume = 0.35;
      audio.play().catch(function (err) {
        console.log("Could not play audio:", err);
        alert("Add an ambient.mp3 file inside frontend/assets/audio/ to enable music.");
      });
      toggleBtn.textContent = "🔊";
      toggleBtn.classList.add("on");
      isPlaying = true;
    }
  });

})();