/**
 * @fileoverview NetShield Sim - Accessible Tooltip Engine
 * 400ms hover delay, keyboard focus support, smart viewport positioning.
 * Matches DESIGN.md §6.2.
 */

let tooltipEl = null;
let showTimer = null;
let currentTarget = null;

const HOVER_DELAY_MS = 400;

/**
 * Initializes tooltip listeners across the application.
 */
export function initTooltips() {
  tooltipEl = document.getElementById('app-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'app-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tooltipEl);
  }

  // Delegated event listening for hover & focus
  document.addEventListener('mouseover', handleTriggerEnter);
  document.addEventListener('mouseout', handleTriggerLeave);
  document.addEventListener('focusin', handleTriggerEnter);
  document.addEventListener('focusout', handleTriggerLeave);
}

function handleTriggerEnter(e) {
  const target = e.target.closest('[data-tooltip-title], [data-tooltip]');
  if (!target) return;

  currentTarget = target;
  clearTimeout(showTimer);

  showTimer = setTimeout(() => {
    if (currentTarget === target) {
      displayTooltip(target);
    }
  }, HOVER_DELAY_MS);
}

function handleTriggerLeave(e) {
  const target = e.target.closest('[data-tooltip-title], [data-tooltip]');
  if (target && target === currentTarget) {
    hideTooltip();
  }
}

/**
 * Renders and positions the tooltip near the target element.
 * @param {HTMLElement} target 
 */
function displayTooltip(target) {
  if (!tooltipEl) return;

  const title = target.getAttribute('data-tooltip-title') || '';
  const text = target.getAttribute('data-tooltip-text') || target.getAttribute('data-tooltip') || '';

  if (!title && !text) return;

  tooltipEl.innerHTML = '';

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'tooltip-title';
    titleEl.textContent = title;
    tooltipEl.appendChild(titleEl);
  }

  if (text) {
    const bodyEl = document.createElement('div');
    bodyEl.className = 'tooltip-body';
    bodyEl.textContent = text;
    tooltipEl.appendChild(bodyEl);
  }

  tooltipEl.classList.add('visible');
  tooltipEl.setAttribute('aria-hidden', 'false');

  // Positioning
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const margin = 8;

  let top = rect.bottom + margin;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

  // Viewport bounds checking
  if (left < margin) {
    left = margin;
  } else if (left + tooltipRect.width > window.innerWidth - margin) {
    left = window.innerWidth - tooltipRect.width - margin;
  }

  // If clipping bottom, place above
  if (top + tooltipRect.height > window.innerHeight - margin) {
    top = rect.top - tooltipRect.height - margin;
  }

  tooltipEl.style.top = `${Math.round(top)}px`;
  tooltipEl.style.left = `${Math.round(left)}px`;
}

/**
 * Hides the tooltip.
 */
export function hideTooltip() {
  clearTimeout(showTimer);
  currentTarget = null;
  if (tooltipEl) {
    tooltipEl.classList.remove('visible');
    tooltipEl.setAttribute('aria-hidden', 'true');
  }
}
