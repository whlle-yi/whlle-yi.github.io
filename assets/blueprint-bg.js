// Blueprint background: pale-blue wireframe polyhedra drifting in 3D,
// rendered on a fixed full-viewport canvas behind the content.
// Pure Canvas 2D, no dependencies; respects prefers-reduced-motion,
// pauses when the tab is hidden, and follows light/dark theme.
(() => {
  'use strict';
  const canvas = document.getElementById('bp-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- polyhedra: {v: [[x,y,z]...], e: [[a,b]...]} ----
  const cube = (() => {
    const v = [], e = [];
    for (let i = 0; i < 8; i++) v.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1]);
    for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
      let d = 0; for (let k = 0; k < 3; k++) if (v[a][k] !== v[b][k]) d++;
      if (d === 1) e.push([a, b]);
    }
    return { v, e };
  })();
  const tetra = { v: [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]], e: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]] };
  const octa = { v: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]], e: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]] };
  const icosa = (() => {
    const p = (1 + Math.sqrt(5)) / 2;
    const v = [];
    for (const s of [-1, 1]) for (const t of [-1, 1]) {
      v.push([0, s, t * p]); v.push([s, t * p, 0]); v.push([t * p, 0, s]);
    }
    const e = [];
    const d2 = (a, b) => (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
    const min = Math.min(...v.map((a, i) => Math.min(...v.filter((_, j) => j !== i).map(b => d2(a, b)))));
    for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++)
      if (Math.abs(d2(v[a], v[b]) - min) < 1e-6) e.push([a, b]);
    return { v, e };
  })();

  const SHAPES = [cube, tetra, octa, icosa];
  const solids = [];
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    solids.push({
      shape: SHAPES[i % SHAPES.length],
      x: -2.7 + rand() * 5.4, y: -1.25 + rand() * 2.5, z: 1.7 + rand() * 2.6,
      rx: rand() * Math.PI, ry: rand() * Math.PI,
      wx: (rand() - 0.5) * 0.22, wy: (rand() - 0.5) * 0.28,
      bob: rand() * Math.PI * 2, size: 0.09 + rand() * 0.08,
    });
  }

  // ---- palette follows light/dark ----
  const dark = () =>
    document.documentElement.getAttribute('data-bs-theme') === 'dark' ||
    (!document.documentElement.hasAttribute('data-bs-theme') &&
      matchMedia('(prefers-color-scheme: dark)').matches);
  const palette = () => dark()
    ? { line: [126, 184, 226], dot: [160, 210, 245], glow: 'rgba(126, 184, 226, 0.05)' }
    : { line: [74, 138, 186], dot: [96, 158, 205], glow: 'rgba(74, 138, 186, 0.04)' };

  // ---- canvas sizing ----
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', () => { resize(); if (reduce.matches) draw(performance.now()); });
  resize();

  // ---- gentle mouse parallax ----
  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', event => {
    tx = (event.clientX / innerWidth - 0.5) * 2;
    ty = (event.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  // ---- projection ----
  function draw(now) {
    const pal = palette();
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2 + mx * 46, cy = H / 2 + my * 30;
    const f = Math.min(W, H) * 1.05;
    mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
    for (const s of solids) {
      const bobY = Math.sin(now / 4200 + s.bob) * 0.06;
      const cosx = Math.cos(s.rx), sinx = Math.sin(s.rx);
      const cosy = Math.cos(s.ry), siny = Math.sin(s.ry);
      const pts = s.shape.v.map(([vx, vy, vz]) => {
        let y = vy * cosx - vz * sinx, z = vy * sinx + vz * cosx;   // rotate X
        let x = vx * cosy + z * siny; z = -vx * siny + z * cosy;    // rotate Y
        x *= s.size; y *= s.size; z = z * s.size + s.z;
        const k = f / z;
        return [cx + (s.x + x) * k, cy + (s.y + y + bobY) * k, z];
      });
      const depth = Math.max(0, Math.min(1, 1 - (s.z - 1.7) / 2.6)); // 近实远虚
      const lineA = 0.09 + depth * 0.18, dotA = 0.14 + depth * 0.24;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${pal.line[0]},${pal.line[1]},${pal.line[2]},${lineA.toFixed(3)})`;
      ctx.beginPath();
      for (const [a, b] of s.shape.e) {
        ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(${pal.dot[0]},${pal.dot[1]},${pal.dot[2]},${dotA.toFixed(3)})`;
      for (const [px, py] of pts) ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
  }

  // ---- loop ----
  let raf = 0, last = 0;
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < 33) return;            // ~30fps 足够
    last = now;
    for (const s of solids) { s.rx += s.wx / 30; s.ry += s.wy / 30; }
    draw(now);
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  if (reduce.matches) { draw(performance.now()); }
  else {
    start();
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    reduce.addEventListener('change', () => reduce.matches ? (stop(), draw(performance.now())) : start());
  }
})();
