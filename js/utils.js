/**
 * @fileoverview NetShield Sim - Utility Helpers
 * Input validation, sanitization, ID generation, formatting, geometry, and toasts.
 * Follows DESIGN.md §11 (Security in UI).
 */

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates a device or topology name (1-20 chars, alphanumeric, space, dash, underscore).
 * @param {string} name 
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateName(name) {
  if (typeof name !== 'string') return { valid: false, error: 'Name must be text.' };
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    return { valid: false, error: 'Please enter a name between 1 and 20 characters.' };
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, numbers, spaces, - and _.' };
  }
  return { valid: true, error: null };
}

/**
 * Validates an IPv4 address.
 * @param {string} ip 
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateIPv4(ip) {
  if (typeof ip !== 'string') return { valid: false, error: 'IP must be text.' };
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) {
    return { valid: false, error: 'IP address must have 4 numbers separated by dots (e.g. 192.168.1.1).' };
  }
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return { valid: false, error: 'Each section of an IP address must be a number.' };
    }
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) {
      return { valid: false, error: 'Each section of an IP address must be between 0 and 255.' };
    }
  }
  return { valid: true, error: null };
}

/**
 * Validates a numeric range.
 * @param {number|string} val 
 * @param {number} min 
 * @param {number} max 
 * @param {string} fieldName 
 * @returns {{ valid: boolean, error: string|null, value: number }}
 */
export function validateNumber(val, min, max, fieldName = 'Value') {
  const num = Number(val);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number.`, value: min };
  }
  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}.`, value: Math.max(min, Math.min(max, num)) };
  }
  return { valid: true, error: null, value: num };
}

/**
 * Generates unique identifiers with semantic prefixes.
 * @param {string} prefix 
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Snaps a coordinate to the nearest grid step.
 * @param {number} val 
 * @param {number} step 
 * @returns {number}
 */
export function snapToGrid(val, step = 10) {
  return Math.round(val / step) * step;
}

/**
 * Clamps a number between min and max.
 * @param {number} val 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Formats a timestamp into HH:MM:SS or HH:MM.
 * @param {number|Date} [date] 
 * @param {boolean} [includeSeconds=true] 
 * @returns {string}
 */
export function formatTime(date = new Date(), includeSeconds = true) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  if (!includeSeconds) return `${h}:${m}`;
  const s = pad(d.getSeconds());
  return `${h}:${m}:${s}`;
}

/**
 * Euclidean distance between two points.
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Linear interpolation between a and b.
 * @param {number} a 
 * @param {number} b 
 * @param {number} t 
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Debounce helper.
 * @param {Function} fn 
 * @param {number} delay 
 * @returns {Function}
 */
export function debounce(fn, delay = 250) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle helper.
 * @param {Function} fn 
 * @param {number} limit 
 * @returns {Function}
 */
export function throttle(fn, limit = 100) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Displays a non-intrusive toast notification.
 * @param {string} message - Plain English message
 * @param {'info'|'success'|'warning'|'danger'} [type='info'] 
 * @param {number} [duration=4000] 
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');

  const iconsMap = {
    info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    danger: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
  };

  const iconEl = document.createElement('span');
  iconEl.innerHTML = iconsMap[type] || iconsMap.info;

  const textEl = document.createElement('div');
  textEl.className = 'toast-message';
  textEl.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Close toast');
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  closeBtn.addEventListener('click', () => {
    dismissToast(toast);
  });

  toast.appendChild(iconEl.firstElementChild);
  toast.appendChild(textEl);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  const timeoutId = setTimeout(() => {
    dismissToast(toast);
  }, duration);

  function dismissToast(el) {
    clearTimeout(timeoutId);
    el.classList.add('hiding');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  }
}
