/**
 * @fileoverview NetShield Sim - Cover Opening Page
 * Animated network constellation background, hero branding, and workspace transition.
 * Matches the video's title card exactly.
 */

import { fitToScreen } from './canvas.js';

let coverPageEl = null;
let canvasEl = null;
let ctx = null;
let coverAnimId = null;
let startTime = performance.now();
let isCoverActive = true;

const NUM_POINTS = 18;
const MAX_CONNECT_DIST = 360;
const ACC_B_RGB = [20, 184, 166]; // Bright teal #14B8A6

/**
 * Initializes the cover opening page and constellation animation.
 */
export function initCoverPage() {
  coverPageEl = document.getElementById('cover-page');
  canvasEl = document.getElementById('constellation-canvas');
  const enterBtn = document.getElementById('enter-workspace-btn');
  const brandHomeBtn = document.getElementById('brand-home-btn');

  if (!coverPageEl || !canvasEl) return;

  ctx = canvasEl.getContext('2d');
  resizeCanvas();

  window.addEventListener('resize', resizeCanvas);

  enterBtn?.addEventListener('click', () => {
    hideCoverPage();
  });

  brandHomeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showCoverPage();
  });

  // Space or Enter key navigates to workspace if cover page is open
  window.addEventListener('keydown', (e) => {
    if (!isCoverActive) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      hideCoverPage();
    }
  });

  // Start animated constellation
  startTime = performance.now();
  startConstellationLoop();
}

/**
 * Sizes the canvas properly for High DPI displays.
 */
function resizeCanvas() {
  if (!canvasEl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvasEl.width = w * dpr;
  canvasEl.height = h * dpr;
  canvasEl.style.width = `${w}px`;
  canvasEl.style.height = `${h}px`;

  if (ctx) {
    ctx.scale(dpr, dpr);
  }
}

/**
 * Hides the cover page with a smooth transition and displays the workspace.
 */
export function hideCoverPage() {
  if (!coverPageEl) return;
  isCoverActive = false;
  coverPageEl.classList.add('hidden');

  if (coverAnimId) {
    cancelAnimationFrame(coverAnimId);
    coverAnimId = null;
  }

  // Recalculate topology fit after workspace is visible
  setTimeout(() => {
    fitToScreen();
  }, 250);
}

/**
 * Re-opens the cover page.
 */
export function showCoverPage() {
  if (!coverPageEl) return;
  isCoverActive = true;
  coverPageEl.classList.remove('hidden');
  resizeCanvas();
  startTime = performance.now();
  startConstellationLoop();
}

/**
 * Starts the requestAnimationFrame loop for floating constellation nodes and cables.
 */
function startConstellationLoop() {
  if (coverAnimId) return;

  function tick(now) {
    if (!isCoverActive) return;
    const te = (now - startTime) / 1000;
    renderConstellation(te);
    coverAnimId = requestAnimationFrame(tick);
  }

  coverAnimId = requestAnimationFrame(tick);
}

/**
 * Renders the floating nodes and dynamic distance-based links.
 * Matches exact video mathematical constellation formula.
 * @param {number} te - Elapsed seconds
 */
function renderConstellation(te) {
  if (!ctx || !canvasEl) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  // Compute 18 harmonic points
  const pts = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const baseX = (0.05 + ((i * 0.6180339887) % 1) * 0.90) * w;
    const baseY = (0.06 + ((i * 0.7548776662) % 1) * 0.88) * h;
    const oscX = 22 * Math.sin(te * 0.5 + i);
    const oscY = 16 * Math.cos(te * 0.4 + i * 1.3);
    pts.push([baseX + oscX, baseY + oscY]);
  }

  // Connect close points with fading teal links
  const scaleFactor = Math.min(1.2, Math.max(0.7, w / 1400));
  const maxDist = MAX_CONNECT_DIST * scaleFactor;

  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const p1 = pts[i];
      const p2 = pts[j];
      const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);

      if (d < maxDist) {
        const alpha = (0.35 * (1 - d / maxDist)).toFixed(3);
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.strokeStyle = `rgba(${ACC_B_RGB[0]}, ${ACC_B_RGB[1]}, ${ACC_B_RGB[2]}, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // Draw bright teal glowing dots
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    ctx.beginPath();
    ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ACC_B_RGB[0]}, ${ACC_B_RGB[1]}, ${ACC_B_RGB[2]}, 0.45)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${ACC_B_RGB[0]}, ${ACC_B_RGB[1]}, ${ACC_B_RGB[2]})`;
    ctx.fill();
  }
}
