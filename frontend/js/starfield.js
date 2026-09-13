// ============================================================
// starfield.js
// ============================================================
// This file draws the full-screen animated space background:
// - A slow-drifting nebula glow (soft colored clouds)
// - 3 layers of stars at different depths (parallax effect)
// - Occasional shooting stars
//
// It runs on a <canvas id="spaceCanvas"> that must exist in the HTML.
// This file works the same way on both index.html and history.html.

(function () {

  const canvas = document.getElementById("spaceCanvas");
  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // --------------------------------------------------------
  // Star layers: far (small, slow), mid, near (bigger, faster)
  // This is what creates the "depth" / parallax feeling.
  // --------------------------------------------------------

  function createStarLayer(count, minSize, maxSize, speed) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (maxSize - minSize) + minSize,
        baseAlpha: Math.random() * 0.6 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
        speed: speed
      });
    }
    return stars;
  }

  const farStars = createStarLayer(120, 0.4, 1.0, 0.01);
  const midStars = createStarLayer(70, 0.8, 1.6, 0.03);
  const nearStars = createStarLayer(35, 1.2, 2.4, 0.06);

  // --------------------------------------------------------
  // Shooting stars: rare, dramatic, appear randomly over time
  // --------------------------------------------------------

  let shootingStars = [];

  function maybeSpawnShootingStar() {
    // Roughly a small chance per frame, so they feel rare and special.
    if (Math.random() < 0.004) {
      shootingStars.push({
        x: Math.random() * width * 0.6,
        y: Math.random() * height * 0.3,
        length: Math.random() * 120 + 80,
        speed: Math.random() * 8 + 10,
        angle: Math.PI / 5, // diagonal direction
        life: 1.0
      });
    }
  }

  function drawShootingStars() {
    shootingStars.forEach((s) => {
      const tailX = s.x - Math.cos(s.angle) * s.length;
      const tailY = s.y - Math.sin(s.angle) * s.length;

      const gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(242,166,90,${s.life})`);
      gradient.addColorStop(1, "rgba(242,166,90,0)");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.life -= 0.02;
    });

    // Remove shooting stars that have faded out or left the screen.
    shootingStars = shootingStars.filter((s) => s.life > 0 && s.y < height);
  }

  // --------------------------------------------------------
  // Nebula glow: a couple of large, soft, slowly drifting
  // colored blurs behind the stars, to feel less flat/empty.
  // --------------------------------------------------------

  const nebulaBlobs = [
    { x: 0.75, y: 0.25, radius: 0.55, color: "242,166,90", driftSpeed: 0.00006 },
    { x: 0.2, y: 0.75, radius: 0.45, color: "109,211,199", driftSpeed: 0.00004 }
  ];

  function drawNebula(time) {
    nebulaBlobs.forEach((blob, index) => {
      const driftX = Math.sin(time * blob.driftSpeed + index) * 0.05;
      const driftY = Math.cos(time * blob.driftSpeed + index) * 0.05;

      const cx = (blob.x + driftX) * width;
      const cy = (blob.y + driftY) * height;
      const r = blob.radius * Math.max(width, height);

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `rgba(${blob.color}, 0.06)`);
      gradient.addColorStop(1, "rgba(9,11,20,0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });
  }

  // --------------------------------------------------------
  // Draw one layer of stars, with twinkle + slow vertical drift
  // --------------------------------------------------------

  function drawStarLayer(stars, time) {
    stars.forEach((star) => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.phase) * 0.5 + 0.5;
      const alpha = star.baseAlpha * (0.5 + twinkle * 0.5);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,230,240,${alpha})`;
      ctx.fill();

      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
    });
  }

  // --------------------------------------------------------
  // Main animation loop
  // --------------------------------------------------------

  let time = 0;

  function animate() {
    time += 1;

    ctx.clearRect(0, 0, width, height);

    // Base background color (matches --bg so it blends seamlessly)
    ctx.fillStyle = "#090B14";
    ctx.fillRect(0, 0, width, height);

    drawNebula(time);
    drawStarLayer(farStars, time);
    drawStarLayer(midStars, time);
    drawStarLayer(nearStars, time);

    maybeSpawnShootingStar();
    drawShootingStars();

    requestAnimationFrame(animate);
  }

  // Respect users who have asked their OS/browser to reduce motion.
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    // Draw just one still frame instead of animating forever.
    drawNebula(0);
    drawStarLayer(farStars, 0);
    drawStarLayer(midStars, 0);
    drawStarLayer(nearStars, 0);
  } else {
    animate();
  }

})();