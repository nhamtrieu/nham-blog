/** Lightweight canvas fireworks — no extra dependency. */

const COLORS = ["#0d8f5b", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#a78bfa", "#fb7185"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

function burst(particles: Particle[], x: number, y: number, count: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 0,
      maxLife: 40 + Math.random() * 40,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: 2 + Math.random() * 2.5,
    });
  }
}

export function launchVerificationFireworks(durationMs = 2200) {
  if (typeof window === "undefined") {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const particles: Particle[] = [];
  let raf = 0;
  const startedAt = performance.now();

  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize);

  // Opening volleys from bottom-left / bottom-right / center.
  const w = window.innerWidth;
  const h = window.innerHeight;
  burst(particles, w * 0.2, h * 0.35, 48);
  burst(particles, w * 0.8, h * 0.3, 48);
  window.setTimeout(() => burst(particles, w * 0.5, h * 0.28, 64), 280);
  window.setTimeout(() => burst(particles, w * 0.35, h * 0.4, 40), 560);
  window.setTimeout(() => burst(particles, w * 0.65, h * 0.38, 40), 720);

  function tick(now: number) {
    ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i]!;
      p.life += 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.99;

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = 1 - p.life / p.maxLife;
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx!.fill();
    }

    ctx!.globalAlpha = 1;

    if (now - startedAt < durationMs || particles.length > 0) {
      raf = window.requestAnimationFrame(tick);
      return;
    }

    window.cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    canvas.remove();
  }

  raf = window.requestAnimationFrame(tick);
}
