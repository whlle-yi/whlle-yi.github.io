// Blueprint background: colorful wireframe polyhedra drifting in 3D,
// mouse movement tilts them so different faces come into view.
// Pure Canvas 2D; respects prefers-reduced-motion, pauses when hidden,
// follows light/dark theme.
(() => {
  'use strict';
  const canvas = document.getElementById('bp-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- polyhedra ----
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
  const SHAPES = [icosa, cube, octa, tetra, icosa, cube, octa];

  // ---- palette: 每只一种颜色,蓝系家族、深浅有别;亮/暗各配一档 ----
  const COLORS = [
    { light: [40, 100, 152],  dark: [112, 176, 224] },  // 钢蓝
    { light: [30, 126, 126],  dark: [92, 202, 198] },   // 青
    { light: [70, 86, 164],   dark: [142, 156, 232] },  // 靛
    { light: [22, 84, 134],   dark: [98, 168, 218] },   // 深海蓝
    { light: [88, 64, 148],   dark: [172, 150, 232] },  // 紫
    { light: [16, 110, 108],  dark: [80, 196, 190] },   // 深青
    { light: [56, 78, 140],   dark: [128, 150, 226] },  // 蓝紫
  ];

  // ---- scene ----
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const solids = [];
  for (let i = 0; i < 7; i++) {
    solids.push({
      shape: SHAPES[i % SHAPES.length],
      ci: i % COLORS.length,
      x: -2.2 + rand() * 4.4, y: -1.1 + rand() * 2.2, z: 1.6 + rand() * 2.4,
      rx: rand() * Math.PI, ry: rand() * Math.PI,
      wx: (rand() - 0.5) * 0.18, wy: (rand() - 0.5) * 0.22,
      bob: rand() * Math.PI * 2, size: 0.15 + rand() * 0.13,
      sens: 0.6 + rand() * 0.8,             // 鼠标倾斜灵敏度,各自不同
      flip: rand() > 0.5 ? 1 : -1,
    });
  }

  // ---- theme ----
  const dark = () =>
    document.documentElement.getAttribute('data-bs-theme') === 'dark' ||
    (!document.documentElement.hasAttribute('data-bs-theme') &&
      matchMedia('(prefers-color-scheme: dark)').matches);
  const rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const linkColor = () => dark() ? [120, 160, 210] : [70, 104, 150];

  // ---- canvas ----
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', () => { resize(); if (reduce.matches) draw(performance.now()); });
  resize();

  // ---- 每 10 秒重生一次:位置/大小/形状/颜色全部重随机 ----
  let lastSwap = performance.now(), swapState = null;
  const SWAP_MS = 5000, FADE_MS = 650;
  function respawn() {
    for (const s of solids) {
      s.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      s.ci = Math.floor(Math.random() * COLORS.length);
      s.x = -2.2 + Math.random() * 4.4; s.y = -1.1 + Math.random() * 2.2; s.z = 1.6 + Math.random() * 2.4;
      s.size = 0.15 + Math.random() * 0.13;
      s.wx = (Math.random() - 0.5) * 0.18; s.wy = (Math.random() - 0.5) * 0.22;
      s.sens = 0.6 + Math.random() * 0.8;
    }
  }

  // ---- mouse: 视差 + 倾斜转动 ----
  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', event => {
    tx = (event.clientX / innerWidth - 0.5) * 2;
    ty = (event.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  function draw(now, ga) {
    ctx.globalAlpha = ga === undefined ? 1 : ga;
    ctx.clearRect(0, 0, W, H);
    mx += (tx - mx) * 0.045; my += (ty - my) * 0.045;
    const cx = W / 2 + mx * 40, cy = H / 2 + my * 26;
    const f = Math.min(W, H) * 1.05;
    const dk = dark();
    const cloud = [];

    for (const s of solids) {
      const bobY = Math.sin(now / 4200 + s.bob) * 0.06;
      const rx = s.rx + my * 0.85 * s.sens;              // 鼠标上下 → 翻转
      const ry = s.ry + mx * 0.95 * s.sens * s.flip;     // 鼠标左右 → 翻转
      const cosx = Math.cos(rx), sinx = Math.sin(rx);
      const cosy = Math.cos(ry), siny = Math.sin(ry);
      const pts = s.shape.v.map(([vx, vy, vz]) => {
        let py = vy * cosx - vz * sinx, pz = vy * sinx + vz * cosx;
        let px = vx * cosy + pz * siny; pz = -vx * siny + pz * cosy;
        px *= s.size; py *= s.size; pz = pz * s.size + s.z;
        const k = f / pz;
        return [cx + (s.x + px) * k, cy + (s.y + py + bobY) * k, pz];
      });
      const depth = Math.max(0, Math.min(1, 1 - (s.z - 1.6) / 2.4));
      const base = dk ? COLORS[s.ci].dark : COLORS[s.ci].light;
      const lineA = 0.24 + depth * 0.3, dotA = 0.3 + depth * 0.34;
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgb(base, lineA);
      ctx.beginPath();
      for (const [a, b] of s.shape.e) {
        ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();
      ctx.fillStyle = rgb(base, dotA);
      for (const [px, py] of pts) ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      cloud.push(pts);
    }

    // 顶点联动:不同几何体之间距离近的顶点牵线(星座网络)
    const LINK = 170, lc = linkColor();
    for (let a = 0; a < cloud.length; a++) for (let b = a + 1; b < cloud.length; b++) {
      for (const pa of cloud[a]) for (const pb of cloud[b]) {
        const dx = pa[0] - pb[0], dy = pa[1] - pb[1];
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const k = 1 - Math.sqrt(d2) / LINK;
          ctx.strokeStyle = rgb(lc, k * 0.2);
          ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
        }
      }
    }
  }

  // ---- loop ----
  let raf = 0, last = 0;
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < 33) return;
    last = now;
    for (const s of solids) { s.rx += s.wx / 30; s.ry += s.wy / 30; }
    let ga = 1;
    if (swapState) {
      const e = now - swapState.t0;
      if (swapState.phase === 0) {
        ga = Math.max(0, 1 - e / FADE_MS);
        if (e >= FADE_MS) { respawn(); swapState.phase = 1; swapState.t0 = now; }
      } else {
        ga = Math.min(1, e / FADE_MS);
        if (e >= FADE_MS) { swapState = null; lastSwap = now; }
      }
    } else if (now - lastSwap > SWAP_MS) {
      swapState = { t0: now, phase: 0 };
    }
    draw(now, ga);
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

