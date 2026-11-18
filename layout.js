(function () {
  'use strict';

  const root = document.documentElement;
  const dock = document.querySelector('.dock-cluster');
  const topbar = document.querySelector('.topbar');
  if (!dock || !topbar) return;

  const WIDGET_SELECTOR = '.flip-panel, .control-card, .tool-card';
  const GAP = 10;
  const EDGE = 6;

  let queued = false;

  function sizeOf(el) {
    if (!el || !el.isConnected) return null;
    if (getComputedStyle(el).display === 'none') return null;
    const w = el.offsetWidth, h = el.offsetHeight;
    return w > 0 && h > 0 ? { w, h } : null;
  }

  function widgetRects() {
    return Array.prototype.map.call(document.querySelectorAll(WIDGET_SELECTOR), el => {
      if (!el.isConnected || getComputedStyle(el).display === 'none') return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    }).filter(Boolean);
  }

  function overlap(a, b) {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  }

  function inflate(r) {
    return { left: r.left - GAP, top: r.top - GAP, right: r.right + GAP, bottom: r.bottom + GAP };
  }

  function cost(box, obstacles) {
    let total = 0;
    for (const o of obstacles) total += overlap(box, inflate(o));
    return total;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function viewportScale() {
    const v = parseFloat(getComputedStyle(root).getPropertyValue('--widget-scale'));
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  function placeDock(obstacles) {
    const base = sizeOf(dock);
    if (!base) return null;
    const scale = viewportScale();
    const w = base.w * scale, h = base.h * scale;
    const grip = dock.querySelector('.resize-grip');
    const gripW = grip && getComputedStyle(grip).display !== 'none' ? h + 8 : 0;
    const vw = window.innerWidth, vh = window.innerHeight;
    const margin = Math.max(EDGE, Math.round(Math.min(vw, vh) * 0.03));
    const half = w / 2, hh = h / 2;
    const candidates = [
      [vw / 2, vh - hh - 2],
      [vw / 2, hh + 2],
      [half + gripW / 2 + margin, vh - hh - margin],
      [vw - half - gripW / 2 - margin, vh - hh - margin],
      [half + gripW / 2 + margin, hh + margin],
      [vw - half - gripW / 2 - margin, hh + margin],
      [half + gripW / 2 + margin, vh / 2],
      [vw - half - gripW / 2 - margin, vh / 2]
    ];
    let best = null, bestCost = Infinity;
    candidates.forEach(([x, y], i) => {
      const cx = clamp(x, half + EDGE, vw - half - gripW - EDGE);
      const cy = clamp(y, hh + 2, vh - hh - 2);
      const box = { left: cx - half, top: cy - hh, right: cx + half + gripW, bottom: cy + hh };
      const value = cost(box, obstacles) + i * 0.01;
      if (value < bestCost) { bestCost = value; best = { x: cx, y: cy }; }
    });
    return best && { ...best, w, h, gripW };
  }

  function placeControls(obstacles) {
    const base = sizeOf(topbar);
    if (!base) return null;
    const w = base.w, h = base.h;
    const vw = window.innerWidth, vh = window.innerHeight;
    const margin = 2;
    const candidates = [
      [vw - w - margin, margin],
      [margin, margin],
      [vw - w - margin, vh - h - margin],
      [margin, vh - h - margin],
      [(vw - w) / 2, margin],
      [(vw - w) / 2, vh - h - margin]
    ];
    let best = null, bestCost = Infinity;
    candidates.forEach(([x, y], i) => {
      const cx = clamp(x, 2, vw - w - 2);
      const cy = clamp(y, 2, vh - h - 2);
      const box = { left: cx, top: cy, right: cx + w, bottom: cy + h };
      const value = cost(box, obstacles) + i * 0.01;
      if (value < bestCost) { bestCost = value; best = { x: cx, y: cy }; }
    });
    return best;
  }

  function refresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const widgets = widgetRects();
      const dockPos = placeDock(widgets);
      if (!dockPos) return;

      root.style.setProperty('--floating-toolbar-x', Math.round(dockPos.x) + 'px');
      root.style.setProperty('--floating-toolbar-y', Math.round(dockPos.y) + 'px');

      const dockBox = {
        left: dockPos.x - dockPos.w / 2,
        top: dockPos.y - dockPos.h / 2,
        right: dockPos.x + dockPos.w / 2 + dockPos.gripW,
        bottom: dockPos.y + dockPos.h / 2
      };
      const controls = placeControls(widgets.concat([dockBox]));
      if (controls) {
        root.style.setProperty('--floating-controls-x', Math.round(controls.x) + 'px');
        root.style.setProperty('--floating-controls-y', Math.round(controls.y) + 'px');
      }
    });
  }

  const HIDE_DELAY = 700;
  const HOVER_PAD = 18;
  let hideTimer = null;
  let pointerDown = false;
  const grip = dock.querySelector('.resize-grip');
  const pill = dock.querySelector('.tool-dock');

  function showControls() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    document.body.classList.remove('controls-hidden');
  }

  function scheduleHide() {
    if (hideTimer || pointerDown) return;
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (!pointerDown) document.body.classList.add('controls-hidden');
    }, HIDE_DELAY);
  }

  function pointIn(x, y, r) {
    return x >= r.left - HOVER_PAD && x <= r.right + HOVER_PAD &&
           y >= r.top - HOVER_PAD && y <= r.bottom + HOVER_PAD;
  }

  function overUI(x, y) {
    for (const r of widgetRects()) if (pointIn(x, y, r)) return true;
    for (const el of [dock, topbar, pill, grip]) {
      if (!el || getComputedStyle(el).display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && pointIn(x, y, r)) return true;
    }
    return false;
  }

  window.addEventListener('pointermove', e => {
    if (overUI(e.clientX, e.clientY)) showControls();
    else scheduleHide();
  }, { passive: true });
  document.addEventListener('pointerdown', () => { pointerDown = true; showControls(); }, true);
  window.addEventListener('pointerup', () => { pointerDown = false; });
  window.addEventListener('pointercancel', () => { pointerDown = false; });
  document.addEventListener('pointerenter', showControls);
  document.addEventListener('pointerleave', scheduleHide);
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) scheduleHide(); });
  window.addEventListener('blur', scheduleHide);

  const ro = new ResizeObserver(refresh);
  ro.observe(document.body);
  document.querySelectorAll(WIDGET_SELECTOR + ', .dock-cluster, .topbar').forEach(el => ro.observe(el));

  const mo = new MutationObserver(refresh);
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('.page').forEach(p => mo.observe(p, { attributes: true, attributeFilter: ['class'] }));

  window.addEventListener('resize', refresh);
  refresh();

  window.flipClockLayout = { refresh };
})();
