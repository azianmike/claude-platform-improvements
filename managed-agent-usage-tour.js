// Guided demo tour for the Managed Agent Usage Monitoring prototype.
// Persists step state in localStorage so the tour can resume after refresh.
(function () {
  'use strict';

  const STORAGE_KEY = 'maut:tour';

  const STEPS = [
    {
      target: '#sessions-usage-table',
      title: 'Find the expensive run',
      body: 'The Sessions table adds cost, tokens, duration, anomaly state, and email status so you can move from agent-level spend to the exact run.',
      position: 'bottom',
      prepare: () => showSessionsForHotAgent(),
    },
    {
      target: '[data-tour="session-anomaly-badge"]',
      title: 'Automatic anomaly flag',
      body: 'A session is flagged when it crosses any enabled threshold: session cost, tokens used, or time spent.',
      position: 'left',
      prepare: () => showSessionsForHotAgent(),
    },
    {
      target: '[data-tour="configure-detectors"]',
      title: 'Configure detectors',
      body: 'Teams can tune the lightweight detector thresholds without turning this into a budgeting or spend-cap product.',
      position: 'left',
      prepare: () => showSessionsForHotAgent(),
      action: () => callGlobal('openDetectorModal'),
    },
    {
      target: '#detector-modal .detector-modal',
      title: 'Tune the thresholds',
      body: 'The detector stays simple: alert when cost, token usage, or duration exceeds your preferred threshold.',
      position: 'left',
      prepare: () => showDetectorModal(),
    },
    {
      target: '[data-tour="detector-email-row"]',
      title: 'Control email alerts',
      body: 'Email alerts can be enabled separately from detection. When on, the agent creator gets the alert with a one-hour per-agent cooldown.',
      position: 'left',
      prepare: () => showDetectorModal(),
    },
    {
      target: '[data-tour="session-anomaly-row"]',
      title: 'Open the trace',
      body: 'Click Next to inspect the anomalous session trace and see exactly why the run was flagged.',
      position: 'bottom',
      prepare: () => showSessionsForHotAgent(),
      action: () => callGlobal('openTrace', 'sesn_01_xr924f'),
    },
    {
      target: '[data-tour="trace-anomaly-banner"]',
      title: 'See the trigger reason',
      body: 'The trace banner closes the debugging loop with the cost, token count, duration, and threshold reason in one place.',
      position: 'bottom',
      prepare: () => showTraceForHotSession(),
    },
    {
      target: '[data-tour="email-alert-panel"]',
      title: 'Follow the email alert',
      body: 'The alert includes the agent, session, trigger reason, and a direct trace link so the creator can investigate before the cost incident grows.',
      position: 'left',
      prepare: () => showTraceForHotSession(),
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

  function showAgents() {
    callGlobal('closeDetectorModal');
    callGlobal('setView', 'agents');
  }

  function showSessionsForHotAgent() {
    callGlobal('closeDetectorModal');
    callGlobal('setView', 'sessions', { agentId: 'agent_01J_fkGbPW' });
  }

  function showTraceForHotSession() {
    callGlobal('closeDetectorModal');
    callGlobal('setView', 'trace', { sessionId: 'sesn_01_xr924f' });
  }

  function showDetectorModal() {
    showSessionsForHotAgent();
    callGlobal('openDetectorModal');
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

  function injectStyles() {
    if (document.getElementById('maut-tour-styles')) return;
    const style = document.createElement('style');
    style.id = 'maut-tour-styles';
    style.textContent = `
      .maut-tour-blocker {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: transparent;
        cursor: default;
        display: none;
      }

      .maut-tour-spotlight {
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
        animation: maut-tour-pulse 2.2s infinite;
      }

      @keyframes maut-tour-pulse {
        0%, 100% { outline: 0 solid rgba(139, 124, 219, 0.45); }
        50% { outline: 8px solid rgba(139, 124, 219, 0); }
      }

      .maut-tour-tooltip {
        position: fixed;
        background: #1e1e1e;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 16px 18px 14px;
        width: 330px;
        z-index: 10001;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
        transition: top 0.25s ease, left 0.25s ease, opacity 0.18s ease;
        opacity: 0;
      }
      .maut-tour-tooltip.visible { opacity: 1; }

      .maut-tour-tooltip-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .maut-tour-step {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #5a5a5a;
        font-weight: 600;
      }

      .maut-tour-skip {
        background: none;
        border: none;
        color: #8a8a8a;
        font-size: 11.5px;
        cursor: pointer;
        font-family: inherit;
        padding: 2px 0;
      }
      .maut-tour-skip:hover { color: #ececec; }

      .maut-tour-title {
        font-family: 'Source Serif 4', 'Inter', serif;
        font-size: 15px;
        font-weight: 600;
        color: #ececec;
        letter-spacing: -0.005em;
        margin-bottom: 6px;
      }

      .maut-tour-body {
        font-size: 12.5px;
        color: #a8a8a8;
        line-height: 1.55;
        margin-bottom: 14px;
      }

      .maut-tour-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .maut-tour-dots {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        flex-wrap: wrap;
      }

      .maut-tour-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #333;
        transition: background 0.15s, transform 0.15s;
      }
      .maut-tour-dot.done { background: #444; }
      .maut-tour-dot.active { background: #8b7cdb; transform: scale(1.4); }

      .maut-tour-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .maut-tour-btn {
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
      .maut-tour-btn:hover {
        background: #2a2a2a;
        border-color: #444;
      }
      .maut-tour-btn.primary {
        background: #f5f5f5;
        color: #111;
        border-color: #f5f5f5;
      }
      .maut-tour-btn.primary:hover {
        background: #fff;
        border-color: #fff;
      }

      .maut-tour-arrow {
        position: absolute;
        width: 12px;
        height: 12px;
        background: #1e1e1e;
        border-left: 1px solid #333;
        border-top: 1px solid #333;
        transform: rotate(45deg);
      }
      .maut-tour-arrow.top { bottom: -7px; border: none; border-right: 1px solid #333; border-bottom: 1px solid #333; }
      .maut-tour-arrow.bottom { top: -7px; }
      .maut-tour-arrow.left { right: -7px; border: none; border-top: 1px solid #333; border-right: 1px solid #333; }
      .maut-tour-arrow.right { left: -7px; }

      .maut-tour-launcher {
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
      .maut-tour-launcher:hover {
        background: #252525;
        border-color: #444;
        transform: translateY(-1px);
      }
      .maut-tour-launcher svg { width: 14px; height: 14px; }
      .maut-tour-launcher.hidden { display: none; }

      .maut-tour-toast {
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
      .maut-tour-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .maut-tour-toast .check {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #6ba968;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .maut-tour-toast .check svg { width: 11px; height: 11px; color: #fff; }
    `;
    document.head.appendChild(style);
  }

  function buildOverlay() {
    if (!blockerEl) {
      blockerEl = document.createElement('div');
      blockerEl.className = 'maut-tour-blocker';
      blockerEl.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
      });
      document.body.appendChild(blockerEl);
    }

    if (!spotlightEl) {
      spotlightEl = document.createElement('div');
      spotlightEl.className = 'maut-tour-spotlight';
      spotlightEl.style.display = 'none';
      document.body.appendChild(spotlightEl);
    }

    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'maut-tour-tooltip';
      tooltipEl.style.display = 'none';
      tooltipEl.addEventListener('click', e => e.stopPropagation());
      tooltipEl.addEventListener('mousedown', e => e.stopPropagation());
      document.body.appendChild(tooltipEl);
    }
  }

  function buildLauncher() {
    if (launcherEl) return;
    launcherEl = document.createElement('button');
    launcherEl.className = 'maut-tour-launcher';
    launcherEl.type = 'button';
    launcherEl.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M5.5 8.2L7.2 9.9L10.7 6" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Take usage tour</span>
    `;
    launcherEl.addEventListener('click', start);
    document.body.appendChild(launcherEl);
  }

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
      return `<div class="maut-tour-dot${cls}"></div>`;
    }).join('');

    tooltipEl.innerHTML = `
      <div class="maut-tour-arrow"></div>
      <div class="maut-tour-tooltip-head">
        <span class="maut-tour-step">Step ${currentIdx + 1} of ${total}</span>
        <button class="maut-tour-skip" type="button">Skip tour</button>
      </div>
      <div class="maut-tour-title">${step.title}</div>
      <div class="maut-tour-body">${step.body}</div>
      <div class="maut-tour-foot">
        <div class="maut-tour-dots">${dots}</div>
        <div class="maut-tour-actions">
          ${currentIdx > 0 ? '<button class="maut-tour-btn" data-act="back">Back</button>' : ''}
          <button class="maut-tour-btn primary" data-act="next">${isLast ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;

    tooltipEl.querySelector('.maut-tour-skip').addEventListener('click', skip);
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

    const arrow = tooltipEl.querySelector('.maut-tour-arrow');
    arrow.className = `maut-tour-arrow ${pos}`;
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

  function maybeScrollIntoView(target) {
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    if (rect.top < 80 || rect.bottom > viewportHeight - 80) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      try { step.prepare(); } catch (e) { console.warn('[usage-tour] prepare error', e); }
      await settle();
    }

    const target = await findTarget(step.target);
    if (!target) {
      console.warn('[usage-tour] target not found for step', idx, step.target);
      return;
    }

    if (maybeScrollIntoView(target)) {
      await new Promise(resolve => setTimeout(resolve, 320));
    }

    const rect = target.getBoundingClientRect();
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
      try { step.action(); } catch (e) { console.warn('[usage-tour] action error', e); }
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
    toast.className = 'maut-tour-toast';
    toast.innerHTML = `
      <span class="check">
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span>Usage tour complete. You can restart it from the corner button.</span>
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

  function maybeResume() {
    const state = loadState();
    if (!state.active || typeof state.idx !== 'number') return;
    if (state.idx < 0 || state.idx >= STEPS.length) return;
    setTimeout(() => showStep(state.idx), 250);
  }

  window.addEventListener('resize', () => {
    if (currentIdx < 0) return;
    const step = STEPS[currentIdx];
    if (!step) return;
    const target = document.querySelector(step.target);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    positionSpotlight(rect);
    positionTooltip(rect, step);
  });

  function boot() {
    injectStyles();
    buildOverlay();
    buildLauncher();
    const state = loadState();
    if (state.active && typeof state.idx === 'number') {
      maybeResume();
      return;
    }
    if (currentIdx < 0) start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.managedAgentUsageTour = { start, skip };
})();
