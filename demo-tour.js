// Guided demo tour for the Managed Agents → Evaluations MVP.
// Persists step state in localStorage so it survives cross-page navigation.
(function () {
  'use strict';

  const STORAGE_KEY = 'mat:tour';

  // ───────────────────────────── STEPS ─────────────────────────────
  const STEPS = [
    {
      page: 'sessions.html',
      target: '#sessions-tbody tr:first-child',
      title: 'Start with a real session',
      body: 'Eval scenarios are seeded from sessions you\'ve actually run — successful or failed. Pick a representative one to turn into a regression test.',
      position: 'right',
    },
    {
      page: 'sessions.html',
      target: '#sessions-tbody tr:first-child .dots-btn',
      title: 'Open the row menu',
      body: 'Each session has a row menu of actions. Click Next to open it.',
      position: 'left',
      action: () => document.querySelector('#sessions-tbody tr:first-child .dots-btn').click(),
    },
    {
      page: 'sessions.html',
      target: '#row-pop-0 .popover-item.highlight',
      title: 'Add to eval suite',
      body: 'This is the heart of the workflow: turn a real session into a reusable scenario. Captures the input, tool trace, final output, cost, and latency.',
      position: 'left',
      action: () => document.querySelector('#row-pop-0 .popover-item.highlight').click(),
    },
    {
      page: 'sessions.html',
      target: '#add-suite',
      title: 'Pick the eval suite',
      body: 'Add this scenario to the "Coding Agent Regression Suite" — the collection of tests you\'ll run every time you change the Coding Assistant.',
      position: 'top',
    },
    {
      page: 'sessions.html',
      target: '#add-modal .btn-primary',
      title: 'Confirm the scenario',
      body: 'In a real session, this saves the scenario into the suite. The suite already has 17 other scenarios — let\'s see them.',
      position: 'top',
      action: () => {
        const m = document.getElementById('add-modal');
        if (m) m.classList.remove('open');
      },
      nextPage: 'managed-agent-evals.html',
    },
    {
      page: 'managed-agent-evals.html',
      target: '#suites-tbody tr:first-child',
      title: 'Your eval suites',
      body: 'Each suite tracks pass rate, regressions, and average cost over time. Click any row to view its latest run. Right now we want to test a model upgrade.',
      position: 'bottom',
    },
    {
      page: 'managed-agent-evals.html',
      target: '#suites-tbody tr:first-child .row-actions-btn',
      title: 'Run baseline vs candidate',
      body: 'The Run button kicks off a comparison. We\'ll pit claude-opus-4-7 (current production baseline) against claude-opus-4-8 (candidate).',
      position: 'left',
      action: () => document.querySelector('#suites-tbody tr:first-child .row-actions-btn').click(),
    },
    {
      page: 'managed-agent-evals.html',
      target: '#run-candidate',
      title: 'Pick the candidate',
      body: 'The candidate can be a new model, a tweaked prompt, or a different agent version. The baseline is what\'s in production today.',
      position: 'right',
    },
    {
      page: 'managed-agent-evals.html',
      target: '#run-modal .btn-primary',
      title: 'Start the run',
      body: 'In production this runs both versions in parallel across every scenario, scored by deterministic checks. We\'ll jump to pre-computed results.',
      position: 'top',
      action: () => {
        const m = document.getElementById('run-modal');
        if (m) m.classList.remove('open');
      },
      nextPage: 'managed-agent-evals-results.html',
    },
    {
      page: 'managed-agent-evals-results.html',
      target: '.metrics-card',
      title: 'The headline answer',
      body: 'Pass rate up 6 points — but cost up 29% and 3 new regressions. This is the trade-off you have to evaluate before shipping the model upgrade.',
      position: 'bottom',
    },
    {
      page: 'managed-agent-evals-results.html',
      target: '.scenario-table tbody tr:nth-child(1) .verdict-badge',
      title: 'Spot the regressions',
      body: 'The verdict column flags every change. "Fix auth bug" went from pass to fail — that\'s a regression introduced by the candidate.',
      position: 'right',
    },
    {
      page: 'managed-agent-evals-results.html',
      target: '.scenario-table tbody tr:nth-child(1) .view-diff-link',
      title: 'Open the trace diff',
      body: 'See exactly what changed in the candidate\'s session — tool calls, output, check results — all side by side with the baseline.',
      position: 'left',
      nextPage: 'managed-agent-evals-diff.html',
    },
    {
      page: 'managed-agent-evals-diff.html',
      target: '.tool-call-table',
      title: 'Spot what broke',
      body: 'The candidate reordered tool calls — it ran tests before patching the file, then applied an incorrect fix. That\'s the regression cause.',
      position: 'top',
    },
    {
      page: 'managed-agent-evals-diff.html',
      target: '.page-header .header-actions',
      title: 'Ship or hold',
      body: 'Mark which side is better for record-keeping, then decide: ship 4.8 with the regressions accepted, fix them first, or stay on 4.7. You\'ve closed the loop — real scenarios, deterministic comparison, regression caught before production.',
      position: 'bottom',
    },
  ];

  // ───────────────────────────── STATE ─────────────────────────────
  let currentIdx = -1;
  let spotlightEl, tooltipEl, launcherEl, blockerEl;

  function getCurrentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ idx: currentIdx, active: currentIdx >= 0 }));
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ───────────────────────────── STYLES ─────────────────────────────
  function injectStyles() {
    if (document.getElementById('mat-tour-styles')) return;
    const style = document.createElement('style');
    style.id = 'mat-tour-styles';
    style.textContent = `
      /* Transparent click blocker — swallows clicks so the tour drives navigation */
      .mat-tour-blocker {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: transparent;
        cursor: default;
        display: none;
      }

      .mat-tour-spotlight {
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
        animation: mat-tour-pulse 2.2s infinite;
      }

      @keyframes mat-tour-pulse {
        0%, 100% { outline: 0px solid rgba(139, 124, 219, 0.45); }
        50% { outline: 8px solid rgba(139, 124, 219, 0); }
      }

      .mat-tour-tooltip {
        position: fixed;
        background: #1e1e1e;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 16px 18px 14px;
        width: 320px;
        z-index: 10001;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
        transition: top 0.25s ease, left 0.25s ease, opacity 0.18s ease;
        opacity: 0;
      }
      .mat-tour-tooltip.visible { opacity: 1; }

      .mat-tour-tooltip-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .mat-tour-step {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #5a5a5a;
        font-weight: 600;
      }

      .mat-tour-skip {
        background: none; border: none;
        color: #8a8a8a;
        font-size: 11.5px;
        cursor: pointer;
        font-family: inherit;
        padding: 2px 0;
      }
      .mat-tour-skip:hover { color: #ececec; }

      .mat-tour-title {
        font-family: 'Source Serif 4', 'Inter', serif;
        font-size: 15px;
        font-weight: 600;
        color: #ececec;
        letter-spacing: -0.005em;
        margin-bottom: 6px;
      }

      .mat-tour-body {
        font-size: 12.5px;
        color: #a8a8a8;
        line-height: 1.55;
        margin-bottom: 14px;
      }

      .mat-tour-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .mat-tour-dots {
        display: flex; align-items: center; gap: 4px;
        flex: 1;
        flex-wrap: wrap;
      }

      .mat-tour-dot {
        width: 5px; height: 5px;
        border-radius: 50%;
        background: #333;
        transition: background 0.15s, transform 0.15s;
      }
      .mat-tour-dot.done { background: #444; }
      .mat-tour-dot.active { background: #8b7cdb; transform: scale(1.4); }

      .mat-tour-actions {
        display: flex; gap: 6px;
        flex-shrink: 0;
      }

      .mat-tour-btn {
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
      .mat-tour-btn:hover {
        background: #2a2a2a;
        border-color: #444;
      }
      .mat-tour-btn.primary {
        background: #f5f5f5;
        color: #111;
        border-color: #f5f5f5;
      }
      .mat-tour-btn.primary:hover {
        background: #fff;
        border-color: #fff;
      }

      .mat-tour-arrow {
        position: absolute;
        width: 12px; height: 12px;
        background: #1e1e1e;
        border-left: 1px solid #333;
        border-top: 1px solid #333;
        transform: rotate(45deg);
      }
      .mat-tour-arrow.top { bottom: -7px; border: none; border-right: 1px solid #333; border-bottom: 1px solid #333; }
      .mat-tour-arrow.bottom { top: -7px; }
      .mat-tour-arrow.left { right: -7px; border: none; border-top: 1px solid #333; border-right: 1px solid #333; }
      .mat-tour-arrow.right { left: -7px; }

      /* Launcher */
      .mat-tour-launcher {
        position: fixed;
        bottom: 18px; right: 18px;
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
      .mat-tour-launcher:hover {
        background: #252525;
        border-color: #444;
        transform: translateY(-1px);
      }
      .mat-tour-launcher svg { width: 14px; height: 14px; }
      .mat-tour-launcher.hidden { display: none; }

      /* Completion toast */
      .mat-tour-toast {
        position: fixed;
        bottom: 24px; left: 50%;
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
        display: flex; align-items: center; gap: 10px;
      }
      .mat-tour-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .mat-tour-toast .check {
        width: 18px; height: 18px;
        border-radius: 50%;
        background: #6ba968;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .mat-tour-toast .check svg { width: 11px; height: 11px; color: #fff; }
    `;
    document.head.appendChild(style);
  }

  // ───────────────────────────── DOM ─────────────────────────────
  function buildOverlay() {
    if (!blockerEl) {
      blockerEl = document.createElement('div');
      blockerEl.className = 'mat-tour-blocker';
      blockerEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      document.body.appendChild(blockerEl);
    }
    if (!spotlightEl) {
      spotlightEl = document.createElement('div');
      spotlightEl.className = 'mat-tour-spotlight';
      spotlightEl.style.display = 'none';
      document.body.appendChild(spotlightEl);
    }
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'mat-tour-tooltip';
      tooltipEl.style.display = 'none';
      // Contain clicks inside the tour UI so they never reach page-level
      // document handlers (e.g. sessions.html closes popovers on any
      // document click — which would close the popover we just opened
      // in a step's action before the next step gets to render).
      tooltipEl.addEventListener('click', (e) => e.stopPropagation());
      tooltipEl.addEventListener('mousedown', (e) => e.stopPropagation());
      document.body.appendChild(tooltipEl);
    }
  }

  function buildLauncher() {
    if (launcherEl) return;
    launcherEl = document.createElement('button');
    launcherEl.className = 'mat-tour-launcher';
    launcherEl.type = 'button';
    launcherEl.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M6 6a2 2 0 014 0c0 1.5-2 1.5-2 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="8" cy="11.5" r="0.7" fill="currentColor"/>
      </svg>
      <span>Take the tour</span>
    `;
    launcherEl.addEventListener('click', start);
    document.body.appendChild(launcherEl);
  }

  // ───────────────────────────── RENDER ─────────────────────────────
  function findTarget(selector, retries = 30) {
    return new Promise(resolve => {
      const tick = () => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (--retries <= 0) return resolve(null);
        setTimeout(tick, 60);
      };
      tick();
    });
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
      return `<div class="mat-tour-dot${cls}"></div>`;
    }).join('');

    tooltipEl.innerHTML = `
      <div class="mat-tour-arrow"></div>
      <div class="mat-tour-tooltip-head">
        <span class="mat-tour-step">Step ${currentIdx + 1} of ${total}</span>
        <button class="mat-tour-skip" type="button">Skip tour</button>
      </div>
      <div class="mat-tour-title">${step.title}</div>
      <div class="mat-tour-body">${step.body}</div>
      <div class="mat-tour-foot">
        <div class="mat-tour-dots">${dots}</div>
        <div class="mat-tour-actions">
          ${currentIdx > 0 ? '<button class="mat-tour-btn" data-act="back">Back</button>' : ''}
          <button class="mat-tour-btn primary" data-act="next">${isLast ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;

    tooltipEl.querySelector('.mat-tour-skip').addEventListener('click', skip);
    tooltipEl.querySelector('[data-act="next"]').addEventListener('click', next);
    const backBtn = tooltipEl.querySelector('[data-act="back"]');
    if (backBtn) backBtn.addEventListener('click', back);

    tooltipEl.style.display = 'block';
  }

  function positionTooltip(rect, step) {
    const pos = step.position || 'bottom';
    const gap = 18;
    const W = tooltipEl.offsetWidth;
    const H = tooltipEl.offsetHeight;
    let top, left;

    if (pos === 'top') {
      top = rect.top - H - gap;
      left = rect.left + rect.width / 2 - W / 2;
    } else if (pos === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - W / 2;
    } else if (pos === 'left') {
      top = rect.top + rect.height / 2 - H / 2;
      left = rect.left - W - gap;
    } else { /* right */
      top = rect.top + rect.height / 2 - H / 2;
      left = rect.right + gap;
    }

    // Clamp to viewport with margin
    const M = 16;
    top = Math.max(M, Math.min(window.innerHeight - H - M, top));
    left = Math.max(M, Math.min(window.innerWidth - W - M, left));

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;

    // Position arrow
    const arrow = tooltipEl.querySelector('.mat-tour-arrow');
    arrow.className = `mat-tour-arrow ${pos}`;
    if (pos === 'top' || pos === 'bottom') {
      const targetCenterX = rect.left + rect.width / 2;
      const arrowX = Math.max(20, Math.min(W - 32, targetCenterX - left - 6));
      arrow.style.left = `${arrowX}px`;
      arrow.style.top = '';
      arrow.style.right = '';
      arrow.style.bottom = pos === 'top' ? '-7px' : '';
    } else {
      const targetCenterY = rect.top + rect.height / 2;
      const arrowY = Math.max(20, Math.min(H - 32, targetCenterY - top - 6));
      arrow.style.top = `${arrowY}px`;
      arrow.style.left = '';
      arrow.style.right = '';
      arrow.style.bottom = '';
    }
  }

  function maybeScrollIntoView(target) {
    const rect = target.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.top < 80 || rect.bottom > vh - 80) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    return false;
  }

  async function showStep(idx) {
    const step = STEPS[idx];
    if (!step) return finish();

    if (step.page !== getCurrentPage()) {
      // Off-page: navigation handled by next(). If we land here from resume,
      // just hide UI.
      hideUI();
      return;
    }

    currentIdx = idx;
    saveState();

    const target = await findTarget(step.target);
    if (!target) {
      console.warn('[tour] target not found for step', idx, step.target);
      return;
    }

    if (maybeScrollIntoView(target)) {
      await new Promise(r => setTimeout(r, 320));
    }

    const rect = target.getBoundingClientRect();
    blockerEl.style.display = 'block';
    positionSpotlight(rect);
    renderTooltip(step);
    // Two RAFs to ensure layout settles for offsetWidth/Height
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    positionTooltip(rect, step);
    tooltipEl.classList.add('visible');

    if (launcherEl) launcherEl.classList.add('hidden');
  }

  // ───────────────────────────── ACTIONS ─────────────────────────────
  async function next() {
    const step = STEPS[currentIdx];
    if (!step) return;

    // Hide visible UI before navigation/action so it doesn't flash on closing modals
    tooltipEl.classList.remove('visible');

    // Run the step's action (e.g., open a modal, click a button)
    if (step.action) {
      try { step.action(); } catch (e) { console.warn('[tour] action error', e); }
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));
    }

    // Cross-page transition
    if (step.nextPage) {
      currentIdx++;
      saveState();
      location.href = step.nextPage;
      return;
    }

    // Same-page advance
    if (currentIdx + 1 >= STEPS.length) return finish();
    showStep(currentIdx + 1);
  }

  function back() {
    if (currentIdx <= 0) return;
    const prev = STEPS[currentIdx - 1];
    if (prev.page !== getCurrentPage()) {
      // Cross-page back: navigate and resume there
      currentIdx--;
      saveState();
      location.href = prev.page;
      return;
    }
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
    toast.className = 'mat-tour-toast';
    toast.innerHTML = `
      <span class="check">
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span>Tour complete — you can restart it any time from the corner button.</span>
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
    const firstPage = STEPS[0].page;
    if (firstPage !== getCurrentPage()) {
      location.href = firstPage;
      return;
    }
    showStep(0);
  }

  // ───────────────────────────── RESUME ─────────────────────────────
  function maybeResume() {
    const state = loadState();
    if (!state.active || typeof state.idx !== 'number') return;
    if (state.idx < 0 || state.idx >= STEPS.length) return;
    const step = STEPS[state.idx];
    if (step.page !== getCurrentPage()) return;
    // Wait for any page-level rendering to finish, then show
    setTimeout(() => showStep(state.idx), 250);
  }

  // ───────────────────────────── RESIZE ─────────────────────────────
  window.addEventListener('resize', () => {
    if (currentIdx < 0) return;
    const step = STEPS[currentIdx];
    if (!step || step.page !== getCurrentPage()) return;
    const target = document.querySelector(step.target);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    positionSpotlight(rect);
    positionTooltip(rect, step);
  });

  // ───────────────────────────── BOOT ─────────────────────────────
  function boot() {
    injectStyles();
    buildOverlay();
    buildLauncher();
    maybeResume();
    // Auto-start the full tour from step 1 if no tour is already in progress
    if (currentIdx < 0) {
      const page = getCurrentPage();
      if (page === 'sessions.html' || page === 'managed-agent-evals.html') {
        start();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Public API
  window.matTour = { start, skip };
})();
