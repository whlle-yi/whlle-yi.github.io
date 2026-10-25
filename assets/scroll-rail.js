// Vertical scroll rail: a constellation path on the right edge.
// A gently zigzagging line draws itself with reading progress
// (stroke-dashoffset, eased every frame so it always moves smoothly);
// a glowing comet head rides at the drawing tip, and diamond stars at the
// vertices light up as the line passes them. Read a page, light the whole
// constellation. Hidden when a page doesn't scroll, and on mobile.
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  // Zigzag vertices in viewBox units (40 x 600).
  const xs = [30, 12, 30, 12, 30, 12, 30];
  const ys = [4, 104, 204, 304, 404, 504, 594];

  const rail = document.createElement('div');
  rail.className = 'scroll-rail';
  rail.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 600');
  const d = xs.map((x, i) => (i ? 'L' : 'M') + x + ' ' + ys[i]).join(' ');
  const track = document.createElementNS(NS, 'path');
  track.setAttribute('class', 'rail-track');
  track.setAttribute('d', d);
  const draw = document.createElementNS(NS, 'path');
  draw.setAttribute('class', 'rail-draw');
  draw.setAttribute('d', d);
  const head = document.createElementNS(NS, 'circle');
  head.setAttribute('class', 'rail-head');
  head.setAttribute('r', '3.4');
  svg.append(track, draw, head);
  rail.append(svg);
  document.body.append(rail);

  // Diamond stars at the vertices, with their position along the path (0..1).
  const cum = [0];
  for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const total = cum[cum.length - 1];
  const stars = xs.map((x, i) => {
    const r = document.createElementNS(NS, 'rect');
    const s = 4.6;
    r.setAttribute('class', 'rail-star');
    r.setAttribute('x', x - s / 2);
    r.setAttribute('y', ys[i] - s / 2);
    r.setAttribute('width', s);
    r.setAttribute('height', s);
    r.setAttribute('transform', `rotate(45 ${x} ${ys[i]})`);
    svg.append(r);
    return { node: r, at: cum[i] / total };
  });

  const pathLen = draw.getTotalLength();
  draw.style.strokeDasharray = String(pathLen);
  draw.style.strokeDashoffset = String(pathLen);

  const EASE = 0.14;
  const EPSILON = 0.0005;
  let target = 0;   // -1 = page doesn't scroll
  let shown = 0;
  let raf = 0;

  function progress() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    return max > 4 ? Math.min(1, Math.max(0, window.scrollY / max)) : -1;
  }

  function render(p) {
    rail.classList.toggle('is-idle', p < 0);
    const q = Math.max(0, p);
    draw.style.strokeDashoffset = String(pathLen * (1 - q));
    const pt = draw.getPointAtLength(pathLen * q);
    head.setAttribute('cx', pt.x.toFixed(2));
    head.setAttribute('cy', pt.y.toFixed(2));
    head.style.opacity = p <= 0.001 ? '0' : '1';
    for (const star of stars) star.node.classList.toggle('lit', q >= star.at - 0.002);
  }

  function frame() {
    shown += (target - shown) * EASE;
    if (Math.abs(target - shown) < EPSILON) {
      shown = target;
      render(shown);
      raf = 0;
      return;
    }
    render(shown);
    raf = requestAnimationFrame(frame);
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('scroll', () => { target = progress(); kick(); }, { passive: true });
  window.addEventListener('resize', () => { target = progress(); shown = target; render(shown); });

  target = progress();
  shown = target;
  render(shown);
})();
