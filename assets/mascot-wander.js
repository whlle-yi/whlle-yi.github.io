// Ico flies around the empty left zone of the hero. Each leg has two phases:
// it first turns in place to face the next waypoint, then glides there
// head-first, hovers, and picks the next one. Always on by site-owner
// preference — it ignores bots-paused/bots-static and prefers-reduced-motion.
// Base position (top/left in CSS) is where it starts, head level with the avatar.
(() => {
  'use strict';
  const mascot = document.querySelector('.hero-mascot');
  if (!mascot) return;
  const stage = mascot.closest('.hero-stage');
  const panel = document.querySelector('.hero-identity');
  const terminal = document.querySelector('.composition.terminal');
  if (!stage || !panel || !terminal) return;

  const SPEED = 0.08;        // px per ms ≈ 80 px/s, unhurried flight
  const MIN_FLIGHT = 1400;   // ms
  const MAX_FLIGHT = 6500;   // ms
  const SWING = 12;          // rotation safety margin (shadow removed, bbox ≈ layout box)

  let bounds = null;
  let current = { x: 0, y: 0 };
  let heading = 0;           // accumulated rotation, degrees (0 = head up)
  let seq = 0;               // cancels in-flight phases on resize

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // Wander range in mascot-local coordinates (relative to the CSS base spot).
  // Uses layout geometry only: getBoundingClientRect would be inflated by rotation.
  function measure() {
    if (mascot.offsetParent === null) { bounds = null; return; } // hidden on narrow screens
    const stageRect = stage.getBoundingClientRect();
    const cs = getComputedStyle(mascot);
    const baseLeft = stageRect.left + parseFloat(cs.left);
    const baseTop = stageRect.top + parseFloat(cs.top);
    const panelRect = panel.getBoundingClientRect();
    const termTop = terminal.getBoundingClientRect().top;
    const minX = 16 + SWING - baseLeft;                               // keep clear of the viewport edge
    const maxX = panelRect.left - 24 - SWING - mascot.offsetWidth - baseLeft;  // stop before the content panels
    const maxY = termTop - 12 - SWING - mascot.offsetHeight - baseTop;         // stop above the terminal
    bounds = maxX > minX && maxY > 40 ? { minX, maxX, maxY } : null;
  }

  function apply(x, y, duration) {
    mascot.style.transition = `transform ${Math.round(duration)}ms cubic-bezier(.42,.05,.3,1)`;
    mascot.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) rotate(${heading.toFixed(1)}deg)`;
    current = { x, y };
  }

  function wander() {
    seq++;
    const run = seq;
    measure(); // re-measure every leg: fonts/images can shift the layout after startup
    if (!(bounds && !document.hidden)) { setTimeout(() => { if (run === seq) wander(); }, 900); return; }

    const { minX, maxX, maxY } = bounds;
    const x = rand(minX, maxX);
    const y = rand(40, maxY);
    const dx = x - current.x, dy = y - current.y;
    const dist = Math.hypot(dx, dy);

    // Phase 1: turn in place to face the waypoint (SVG forward is up, so +90deg).
    let turn = 0;
    if (dist > 1) {
      const target = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      turn = ((target - heading + 540) % 360) - 180;  // rotate the short way
      heading += turn;
    }
    const turnDur = clamp(Math.abs(turn) * 6, 320, 1000);
    apply(current.x, current.y, turnDur);

    // Phase 2: fly head-first, then hover before choosing the next waypoint.
    setTimeout(() => {
      if (run !== seq) return;
      const flyDur = clamp(dist / SPEED, MIN_FLIGHT, MAX_FLIGHT);
      apply(x, y, flyDur);
      setTimeout(() => { if (run === seq) wander(); }, flyDur + rand(700, 2400));
    }, turnDur);
  }

  window.addEventListener('resize', () => {
    seq++;  // abandon the in-flight leg
    measure();
    if (bounds) apply(clamp(current.x, bounds.minX, bounds.maxX), clamp(current.y, 40, bounds.maxY), 600);
  });

  wander();
})();
