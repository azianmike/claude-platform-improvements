// Guided demo tour for the Rate limits page.
// Persists step state in localStorage so the tour can resume after refresh.
(function () {
  'use strict';

  const STORAGE_KEY = 'rlp:tour';

  const STEPS = [
    {
      target: '[data-tour="over-limit-row"]',
      title: 'Find the quota that 429\'d',
      body: 'This Claude Haiku Requests row peaked at <strong>131%</strong> of its 1.0K RPM ceiling — the exact signal that maps to the 429s the team is seeing in production.',
      position: 'bottom',
      prepare: () => closeModal(),
    },
    {
      targets: ['[data-tour="tier-section"]', '[data-tour="tier-progress"]'],
      title: 'Anchor the throttle in the current tier',
      body: 'Tier 1 is highlighted on the progress bar so the customer immediately understands <em>why</em> the ceiling is where it is, and which threshold unlocks the next jump.<br><br><strong>Note:</strong> the banner, rate limit tiers, and Upgrade tier button ONLY SHOW when the user is currently running into a rate limit or has run into one in the last 10 minutes.',
      position: 'bottom',
      prepare: () => closeModal(),
    },
    {
      target: '[data-tour="tier-upgrade-button"]',
      title: 'Offer the upgrade action',
      body: 'A dedicated <strong>Upgrade tier</strong> button gives the team a one-click path from "we\'re throttled" to "buying our way out". Click Next to open the purchase flow.',
      position: 'left',
      prepare: () => closeModal(),
      action: () => openModal(),
    },
    {
      target: '[data-tour="credit-amount-input"]',
      title: 'Default to the next tier gap',
      body: 'The $35 default is intentional: a Tier 1 org has already crossed the $5 threshold, and $35 more reaches the $40 Tier 2 threshold.',
      position: 'right',
      prepare: () => openModal(),
    },
  ];

  let currentIdx = -1;
  let spotlightEl;
  let tooltipEl;
  let launcherEl;
  let blockerEl;

  function callGlobal(name, ...args) {
    const fn = window[name];
    if (typeof fn === 'function') return fn(...args);
    return undefined;
  }

  function openModal() {
    callGlobal('openCreditsModal');
  }

  function closeModal() {
    callGlobal('closeCreditsModal');
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ idx: currentIdx, active: currentIdx >= 0 }));
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function injectStyles() {
    if (document.getElementById('rlp-tour-styles')) return;
    const style = document.createElement('style');
    style.id = 'rlp-tour-styles';
    style.textContent = `
      .rlp-tour-blocker {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: transparent;
        cursor: default;
        display: none;
      }

      .rlp-tour-spotlight {
        position: fixed;
        pointer-events: none;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.68);
        border: 2px solid rgba(139, 124, 219, 0.9);
        z-index: 10000;
        transition: top 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                    left 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                    width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                    height 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        animation: rlp-tour-pulse 2.2s infinite;
      }

      @keyframes rlp-tour-pulse {
        0%, 100% { outline: 0 solid rgba(139, 124, 219, 0.45); }
        50% { outline: 8px solid rgba(139, 124, 219, 0); }
      }

      .rlp-tour-tooltip {
        position: fixed;
        background: #1e1e1e;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 16px 18px 14px;
        width: min(330px, calc(100vw - 32px));
        z-index: 10001;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
        transition: top 0.25s ease, left 0.25s ease, opacity 0.18s ease;
        opacity: 0;
      }
      .rlp-tour-tooltip.visible { opacity: 1; }

      .rlp-tour-tooltip-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .rlp-tour-step {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #5a5a5a;
        font-weight: 600;
      }

      .rlp-tour-skip {
        background: none;
        border: none;
        color: #8a8a8a;
        font-size: 11.5px;
        cursor: pointer;
        font-family: inherit;
        padding: 2px 0;
      }
      .rlp-tour-skip:hover { color: #ececec; }

      .rlp-tour-title {
        font-family: 'Source Serif 4', 'Inter', serif;
        font-size: 15px;
        font-weight: 600;
        color: #ececec;
        letter-spacing: 0;
        margin-bottom: 6px;
      }

      .rlp-tour-body {
        font-size: 12.5px;
        color: #a8a8a8;
        line-height: 1.55;
        margin-bottom: 14px;
      }

      .rlp-tour-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .rlp-tour-dots {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        flex-wrap: wrap;
      }

      .rlp-tour-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #333;
        transition: background 0.15s, transform 0.15s;
      }
      .rlp-tour-dot.done { background: #444; }
      .rlp-tour-dot.active { background: #8b7cdb; transform: scale(1.4); }

      .rlp-tour-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .rlp-tour-btn {
        background: transparent;
        border: 1px solid #333;
        color: #ececec;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12.5px;
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        transition: background 0.1s, border-color 0.1s;
      }
      .rlp-tour-btn:hover {
        background: #2a2a2a;
        border-color: #444;
      }
      .rlp-tour-btn.primary {
        background: #f5f5f5;
        color: #111;
        border-color: #f5f5f5;
      }
      .rlp-tour-btn.primary:hover {
        background: #fff;
        border-color: #fff;
      }

      .rlp-tour-arrow {
        position: absolute;
        width: 12px;
        height: 12px;
        background: #1e1e1e;
        border-left: 1px solid #333;
        border-top: 1px solid #333;
        transform: rotate(45deg);
      }
      .rlp-tour-arrow.top { bottom: -7px; border: none; border-right: 1px solid #333; border-bottom: 1px solid #333; }
      .rlp-tour-arrow.bottom { top: -7px; }
      .rlp-tour-arrow.left { right: -7px; border: none; border-top: 1px solid #333; border-right: 1px solid #333; }
      .rlp-tour-arrow.right { left: -7px; }

      .rlp-tour-launcher {
        position: fixed;
        bottom: 18px;
        right: 18px;
        background: #1e1e1e;
        color: #ececec;
        border: 1px solid #333;
        border-radius: 999px;
        padding: 9px 16px 9px 12px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 12.5px;
        font-weight: 500;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        cursor: pointer;
        z-index: 99;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
        transition: background 0.15s, border-color 0.15s, transform 0.15s;
      }
      .rlp-tour-launcher:hover {
        background: #252525;
        border-color: #444;
        transform: translateY(-1px);
      }
      .rlp-tour-launcher svg { width: 14px; height: 14px; }
      .rlp-tour-launcher.hidden { display: none; }

      .rlp-tour-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #1e1e1e;
        border: 1px solid #333;
        border-radius: 10px;
        padding: 14px 20px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #ececec;
        z-index: 10002;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.25s, transform 0.25s;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .rlp-tour-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .rlp-tour-toast .check {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #6ba968;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .rlp-tour-toast .check svg { width: 11px; height: 11px; color: #fff; }
    `;
    document.head.appendChild(style);
  }

  function buildOverlay() {
    if (!blockerEl) {
      blockerEl = document.createElement('div');
      blockerEl.className = 'rlp-tour-blocker';
      blockerEl.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
      });
      document.body.appendChild(blockerEl);
    }

    if (!spotlightEl) {
      spotlightEl = document.createElement('div');
      spotlightEl.className = 'rlp-tour-spotlight';
      spotlightEl.style.display = 'none';
      document.body.appendChild(spotlightEl);
    }

    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'rlp-tour-tooltip';
      tooltipEl.style.display = 'none';
      tooltipEl.addEventListener('click', e => e.stopPropagation());
      tooltipEl.addEventListener('mousedown', e => e.stopPropagation());
      document.body.appendChild(tooltipEl);
    }
  }

  function buildLauncher() {
    if (launcherEl) return;
    launcherEl = document.createElement('button');
    launcherEl.className = 'rlp-tour-launcher';
    launcherEl.type = 'button';
    launcherEl.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M5.5 8.2L7.2 9.9L10.7 6" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Take rate-limits tour</span>
    `;
    launcherEl.addEventListener('click', start);
    document.body.appendChild(launcherEl);
  }

  function getStepSelectors(step) {
    return step.targets || [step.target];
  }

  function findTargets(step, retries = 30) {
    return new Promise(resolve => {
      const selectors = getStepSelectors(step);
      const tick = () => {
        const targets = selectors.map(selector => document.querySelector(selector));
        if (targets.every(Boolean)) return resolve(targets);
        if (--retries <= 0) return resolve(null);
        setTimeout(tick, 60);
      };
      tick();
    });
  }

  function getTargetRect(targets) {
    const rects = targets.map(target => target.getBoundingClientRect());
    const top = Math.min(...rects.map(rect => rect.top));
    const left = Math.min(...rects.map(rect => rect.left));
    const right = Math.max(...rects.map(rect => rect.right));
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    return {
      top,
      left,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  function positionSpotlight(rect) {
    const pad = 6;
    spotlightEl.style.display = 'block';
    spotlightEl.style.top = `${rect.top - pad}px`;
    spotlightEl.style.left = `${rect.left - pad}px`;
    spotlightEl.style.width = `${rect.width + pad * 2}px`;
    spotlightEl.style.height = `${rect.height + pad * 2}px`;
  }

  function renderTooltip(step) {
    const total = STEPS.length;
    const isLast = currentIdx === total - 1;
    const dots = Array.from({ length: total }, (_, i) => {
      let cls = '';
      if (i < currentIdx) cls = ' done';
      else if (i === currentIdx) cls = ' active';
      return `<div class="rlp-tour-dot${cls}"></div>`;
    }).join('');

    tooltipEl.innerHTML = `
      <div class="rlp-tour-arrow"></div>
      <div class="rlp-tour-tooltip-head">
        <span class="rlp-tour-step">Step ${currentIdx + 1} of ${total}</span>
        <button class="rlp-tour-skip" type="button">Skip tour</button>
      </div>
      <div class="rlp-tour-title">${step.title}</div>
      <div class="rlp-tour-body">${step.body}</div>
      <div class="rlp-tour-foot">
        <div class="rlp-tour-dots">${dots}</div>
        <div class="rlp-tour-actions">
          ${currentIdx > 0 ? '<button class="rlp-tour-btn" data-act="back">Back</button>' : ''}
          <button class="rlp-tour-btn primary" data-act="next">${isLast ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;

    tooltipEl.querySelector('.rlp-tour-skip').addEventListener('click', skip);
    tooltipEl.querySelector('[data-act="next"]').addEventListener('click', next);
    const backBtn = tooltipEl.querySelector('[data-act="back"]');
    if (backBtn) backBtn.addEventListener('click', back);

    tooltipEl.style.display = 'block';
  }

  function positionTooltip(rect, step) {
    const pos = step.position || 'bottom';
    const gap = 18;
    const width = tooltipEl.offsetWidth;
    const height = tooltipEl.offsetHeight;
    let top;
    let left;

    if (pos === 'top') {
      top = rect.top - height - gap;
      left = rect.left + rect.width / 2 - width / 2;
    } else if (pos === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - width / 2;
    } else if (pos === 'left') {
      top = rect.top + rect.height / 2 - height / 2;
      left = rect.left - width - gap;
    } else {
      top = rect.top + rect.height / 2 - height / 2;
      left = rect.right + gap;
    }

    const margin = 16;
    top = Math.max(margin, Math.min(window.innerHeight - height - margin, top));
    left = Math.max(margin, Math.min(window.innerWidth - width - margin, left));

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;

    const arrow = tooltipEl.querySelector('.rlp-tour-arrow');
    arrow.className = `rlp-tour-arrow ${pos}`;
    if (pos === 'top' || pos === 'bottom') {
      const targetCenterX = rect.left + rect.width / 2;
      const arrowX = Math.max(20, Math.min(width - 32, targetCenterX - left - 6));
      arrow.style.left = `${arrowX}px`;
      arrow.style.top = '';
      arrow.style.right = '';
      arrow.style.bottom = pos === 'top' ? '-7px' : '';
    } else {
      const targetCenterY = rect.top + rect.height / 2;
      const arrowY = Math.max(20, Math.min(height - 32, targetCenterY - top - 6));
      arrow.style.top = `${arrowY}px`;
      arrow.style.left = '';
      arrow.style.right = '';
      arrow.style.bottom = '';
    }
  }

  function maybeScrollIntoView(targets) {
    // The page scrolls inside `.main`, not the window — so use scrollIntoView
    // on the target itself; the browser will pick the nearest scrollable ancestor.
    const rect = getTargetRect(targets);
    const viewportHeight = window.innerHeight;
    if (rect.top < 80 || rect.bottom > viewportHeight - 80) {
      targets[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    return false;
  }

  async function settle() {
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  async function showStep(idx) {
    const step = STEPS[idx];
    if (!step) return finish();

    currentIdx = idx;
    saveState();

    if (step.prepare) {
      try { step.prepare(); } catch (e) { console.warn('[rate-limits-tour] prepare error', e); }
      await settle();
    }

    const targets = await findTargets(step);
    if (!targets) {
      console.warn('[rate-limits-tour] target not found for step', idx, getStepSelectors(step));
      return;
    }

    if (maybeScrollIntoView(targets)) {
      await new Promise(resolve => setTimeout(resolve, 320));
    }

    const rect = getTargetRect(targets);
    blockerEl.style.display = 'block';
    positionSpotlight(rect);
    renderTooltip(step);
    await settle();
    positionTooltip(rect, step);
    tooltipEl.classList.add('visible');

    if (launcherEl) launcherEl.classList.add('hidden');
  }

  async function next() {
    const step = STEPS[currentIdx];
    if (!step) return;

    tooltipEl.classList.remove('visible');

    if (step.action) {
      try { step.action(); } catch (e) { console.warn('[rate-limits-tour] action error', e); }
      await settle();
    }

    if (currentIdx + 1 >= STEPS.length) return finish();
    showStep(currentIdx + 1);
  }

  function back() {
    if (currentIdx <= 0) return;
    showStep(currentIdx - 1);
  }

  function skip() {
    clearState();
    currentIdx = -1;
    hideUI();
  }

  function finish() {
    clearState();
    currentIdx = -1;
    hideUI();
    showCompleteToast();
  }

  function hideUI() {
    if (spotlightEl) spotlightEl.style.display = 'none';
    if (tooltipEl) {
      tooltipEl.classList.remove('visible');
      tooltipEl.style.display = 'none';
    }
    if (blockerEl) blockerEl.style.display = 'none';
    if (launcherEl) launcherEl.classList.remove('hidden');
  }

  function showCompleteToast() {
    const toast = document.createElement('div');
    toast.className = 'rlp-tour-toast';
    toast.innerHTML = `
      <span class="check">
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span>Rate-limits tour complete. You can restart it from the corner button.</span>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 350);
    }, 4500);
  }

  function start() {
    clearState();
    currentIdx = 0;
    saveState();
    showStep(0);
  }

  window.addEventListener('resize', () => {
    if (currentIdx < 0) return;
    const step = STEPS[currentIdx];
    if (!step) return;
    const targets = getStepSelectors(step).map(selector => document.querySelector(selector));
    if (!targets.every(Boolean)) return;
    const rect = getTargetRect(targets);
    positionSpotlight(rect);
    positionTooltip(rect, step);
  });

  function boot() {
    injectStyles();
    buildOverlay();
    buildLauncher();
    start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.rateLimitsTour = { start, skip };
})();
