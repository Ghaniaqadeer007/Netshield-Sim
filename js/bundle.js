/**
 * NetShield Sim - Standalone Application Bundle
 * Allows running both via HTTP server and directly via local file:// protocol
 */
(function() {
'use strict';

const DEFAULT_TOPOLOGY = {
  "name": "Office Network",
  "version": "1.0",
  "createdAt": "2026-10-24T12:00:00Z",
  "nodes": [
    {
      "id": "node-pc-1",
      "label": "PC-1",
      "type": "pc",
      "ip": "192.168.1.11",
      "x": 240,
      "y": 300,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-pc-2",
      "label": "PC-2",
      "type": "pc",
      "ip": "192.168.1.12",
      "x": 240,
      "y": 560,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-pc-3",
      "label": "PC-3",
      "type": "pc",
      "ip": "192.168.1.13",
      "x": 240,
      "y": 810,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-r-1",
      "label": "R1",
      "type": "router",
      "ip": "192.168.1.1",
      "x": 600,
      "y": 440,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-r-2",
      "label": "R2",
      "type": "router",
      "ip": "192.168.1.2",
      "x": 860,
      "y": 270,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-r-3",
      "label": "R3",
      "type": "router",
      "ip": "192.168.1.3",
      "x": 860,
      "y": 720,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-r-4",
      "label": "R4",
      "type": "router",
      "ip": "192.168.1.4",
      "x": 1120,
      "y": 500,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-srv-1",
      "label": "Server-1",
      "type": "server",
      "ip": "192.168.1.101",
      "x": 1330,
      "y": 290,
      "status": "online",
      "blocked": false
    },
    {
      "id": "node-srv-2",
      "label": "Server-2",
      "type": "server",
      "ip": "192.168.1.102",
      "x": 1330,
      "y": 740,
      "status": "online",
      "blocked": false
    }
  ],
  "links": [
    {
      "id": "link-pc1-r1",
      "source": "node-pc-1",
      "target": "node-r-1",
      "cost": 2,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-pc2-r1",
      "source": "node-pc-2",
      "target": "node-r-1",
      "cost": 1,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-pc3-r3",
      "source": "node-pc-3",
      "target": "node-r-3",
      "cost": 2,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r1-r2",
      "source": "node-r-1",
      "target": "node-r-2",
      "cost": 3,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r1-r3",
      "source": "node-r-1",
      "target": "node-r-3",
      "cost": 4,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r2-r4",
      "source": "node-r-2",
      "target": "node-r-4",
      "cost": 2,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r3-r4",
      "source": "node-r-3",
      "target": "node-r-4",
      "cost": 3,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r2-srv1",
      "source": "node-r-2",
      "target": "node-srv-1",
      "cost": 2,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r4-srv1",
      "source": "node-r-4",
      "target": "node-srv-1",
      "cost": 1,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r4-srv2",
      "source": "node-r-4",
      "target": "node-srv-2",
      "cost": 2,
      "bandwidth": 100,
      "status": "up"
    },
    {
      "id": "link-r3-srv2",
      "source": "node-r-3",
      "target": "node-srv-2",
      "cost": 4,
      "bandwidth": 100,
      "status": "up"
    }
  ],
  "firewallRules": []
};


/* ========== FILE: utils.js ========== */
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
function escapeHTML(str) {
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
function validateName(name) {
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
function validateIPv4(ip) {
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
function validateNumber(val, min, max, fieldName = 'Value') {
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
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Snaps a coordinate to the nearest grid step.
 * @param {number} val 
 * @param {number} step 
 * @returns {number}
 */
function snapToGrid(val, step = 10) {
  return Math.round(val / step) * step;
}

/**
 * Clamps a number between min and max.
 * @param {number} val 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Formats a timestamp into HH:MM:SS or HH:MM.
 * @param {number|Date} [date] 
 * @param {boolean} [includeSeconds=true] 
 * @returns {string}
 */
function formatTime(date = new Date(), includeSeconds = true) {
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
function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Linear interpolation between a and b.
 * @param {number} a 
 * @param {number} b 
 * @param {number} t 
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Debounce helper.
 * @param {Function} fn 
 * @param {number} delay 
 * @returns {Function}
 */
function debounce(fn, delay = 250) {
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
function throttle(fn, limit = 100) {
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
function showToast(message, type = 'info', duration = 4000) {
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


/* ========== FILE: icons.js ========== */
/**
 * @fileoverview NetShield Sim - SVG Icon System
 * 24x24 grid, 1.75px stroke, rounded caps, currentColor.
 * Matches DESIGN.md §8 specifications.
 */

const ICONS = {
  monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>`,

  router: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="13" width="20" height="8" rx="2"/>
    <path d="M6 17h.01M10 17h.01M14 17h.01M18 17h.01"/>
    <path d="M6 13V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v7"/>
    <path d="M14 13V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v7"/>
  </svg>`,

  server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/>
    <line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>`,

  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,

  'cable-cut': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="2.2"/>
  </svg>`,

  select: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3l7 18 3-7 7-3L3 3z"/>
  </svg>`,

  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`,

  pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>`,

  reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>`,

  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>`,

  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`,

  'shield-check': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>`,

  'shield-x': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
  </svg>`,

  'alert-triangle': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,

  flood: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v6m0 0l-3-3m3 3l3-3"/>
    <path d="M17 10l4 4m0 0l-4 4m4-4H3"/>
    <path d="M12 22v-6m0 0l3 3m-3-3l-3 3"/>
  </svg>`,

  scan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 3a9 9 0 0 1 9 9"/>
    <line x1="12" y1="12" x2="19" y2="7"/>
  </svg>`,

  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>`,

  load: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`,

  export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>`,

  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,

  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`,

  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`,

  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,

  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
    <line x1="12" y1="2" x2="12" y2="12"/>
  </svg>`,

  'zoom-in': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`,

  'zoom-out': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`,

  fit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
  </svg>`,

  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,

  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>`,

  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`,

  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7v6h6"/>
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
  </svg>`,

  redo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 7v6h-6"/>
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
  </svg>`,

  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`,

  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`
};

/**
 * Returns an inline SVG string for the requested icon name.
 * @param {string} name - Name of icon from ICONS dictionary
 * @param {string} [className] - Optional CSS class to append
 * @returns {string} SVG HTML string
 */
function getIcon(name, className = '') {
  const svg = ICONS[name] || ICONS.info;
  if (!className) return svg;
  return svg.replace('<svg ', `<svg class="${className}" `);
}


/* ========== FILE: routing.js ========== */
/**
 * @fileoverview NetShield Sim - Routing Engine
 * Dijkstra's shortest path algorithm with Binary Min-Heap priority queue.
 * Pure, testable, and highly optimized (<500ms for 100+ nodes).
 * Matches specifications in DESIGN.md §3 and Prompt.
 */

/**
 * Binary Min-Heap Priority Queue
 */
class MinHeap {
  constructor() {
    this.heap = [];
  }

  /**
   * Pushes an item with a priority into the heap.
   * @param {any} item 
   * @param {number} priority 
   */
  push(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the item with the lowest priority.
   * @returns {{ item: any, priority: number }|null}
   */
  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min;
  }

  /**
   * Checks if heap is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Number of items in heap.
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  _bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.priority >= parent.priority) break;
      this.heap[index] = parent;
      this.heap[parentIndex] = element;
      index = parentIndex;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let swap = null;

      if (leftChildIndex < length) {
        const leftChild = this.heap[leftChildIndex];
        if (leftChild.priority < element.priority) {
          swap = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        const rightChild = this.heap[rightChildIndex];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < this.heap[leftChildIndex].priority)
        ) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      this.heap[swap] = element;
      index = swap;
    }
  }
}

/**
 * Builds an adjacency list from nodes and links.
 * Only considers online nodes and up links.
 * @param {Array<{ id: string, status?: string }>} nodes 
 * @param {Array<{ id: string, source: string, target: string, cost: number, status?: string }>} links 
 * @returns {Map<string, Array<{ neighborId: string, linkId: string, cost: number }>>}
 */
function buildAdjacencyList(nodes, links) {
  const adj = new Map();
  const onlineNodes = new Set();

  for (const node of nodes) {
    if (node.status !== 'disabled') {
      onlineNodes.add(node.id);
      adj.set(node.id, []);
    }
  }

  for (const link of links) {
    if (link.status === 'down') continue;
    if (!onlineNodes.has(link.source) || !onlineNodes.has(link.target)) continue;

    const cost = Math.max(1, Number(link.cost) || 1);
    
    // Bidirectional network links
    if (adj.has(link.source)) {
      adj.get(link.source).push({ neighborId: link.target, linkId: link.id, cost });
    }
    if (adj.has(link.target)) {
      adj.get(link.target).push({ neighborId: link.source, linkId: link.id, cost });
    }
  }

  return adj;
}

/**
 * Computes shortest path from sourceId to targetId using Dijkstra's algorithm.
 * @param {Array<any>} nodes 
 * @param {Array<any>} links 
 * @param {string} sourceId 
 * @param {string} targetId 
 * @returns {{ path: string[], totalCost: number, hops: number, linkIds: string[], stepDetails: Array<{ node: string, distance: number, predecessor: string|null }> } | null}
 */
function findShortestPath(nodes, links, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return null;

  const sourceNode = nodes.find(n => n.id === sourceId);
  const targetNode = nodes.find(n => n.id === targetId);

  if (!sourceNode || sourceNode.status === 'disabled') return null;
  if (!targetNode || targetNode.status === 'disabled') return null;

  const adj = buildAdjacencyList(nodes, links);
  if (!adj.has(sourceId) || !adj.has(targetId)) return null;

  const distances = new Map();
  const predecessors = new Map(); // nodeId -> { prevNode: string, linkId: string }
  const visited = new Set();
  const heap = new MinHeap();

  for (const [nodeId] of adj) {
    distances.set(nodeId, Infinity);
  }

  distances.set(sourceId, 0);
  heap.push(sourceId, 0);

  const stepDetails = [];

  while (!heap.isEmpty()) {
    const { item: current, priority: currentDist } = heap.pop();

    if (visited.has(current)) continue;
    visited.add(current);

    const prevInfo = predecessors.get(current);
    stepDetails.push({
      node: current,
      distance: currentDist,
      predecessor: prevInfo ? prevInfo.prevNode : null
    });

    if (current === targetId) break;

    const neighbors = adj.get(current) || [];
    for (const { neighborId, linkId, cost } of neighbors) {
      if (visited.has(neighborId)) continue;

      const alt = currentDist + cost;
      if (alt < distances.get(neighborId)) {
        distances.set(neighborId, alt);
        predecessors.set(neighborId, { prevNode: current, linkId });
        heap.push(neighborId, alt);
      }
    }
  }

  // Check if target was reached
  if (!predecessors.has(targetId) && sourceId !== targetId) {
    return null;
  }

  // Reconstruct path
  const path = [];
  const linkIds = [];
  let curr = targetId;

  while (curr !== sourceId) {
    path.unshift(curr);
    const step = predecessors.get(curr);
    if (!step) return null;
    linkIds.unshift(step.linkId);
    curr = step.prevNode;
  }
  path.unshift(sourceId);

  return {
    path,
    linkIds,
    totalCost: distances.get(targetId),
    hops: path.length - 1,
    stepDetails
  };
}

/**
 * Performance benchmark helper to verify Dijkstra execution time.
 * @param {number} [nodeCount=100] 
 * @param {number} [edgeProbability=0.08] 
 * @returns {{ timeMs: number, nodeCount: number, edgeCount: number }}
 */
function benchmarkDijkstra(nodeCount = 100, edgeProbability = 0.08) {
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({ id: `bench-node-${i}`, status: 'online' });
  }

  const links = [];
  let edgeId = 0;
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (Math.random() < edgeProbability) {
        links.push({
          id: `bench-link-${edgeId++}`,
          source: nodes[i].id,
          target: nodes[j].id,
          cost: Math.floor(Math.random() * 10) + 1,
          status: 'up'
        });
      }
    }
  }

  const src = nodes[0].id;
  const dst = nodes[nodeCount - 1].id;

  const start = performance.now();
  findShortestPath(nodes, links, src, dst);
  const timeMs = performance.now() - start;

  console.log(`[NetShield Sim Benchmark] Dijkstra with ${nodeCount} nodes and ${links.length} links computed in ${timeMs.toFixed(2)} ms.`);
  return { timeMs, nodeCount, edgeCount: links.length };
}


/* ========== FILE: tooltips.js ========== */
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
function initTooltips() {
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
function hideTooltip() {
  clearTimeout(showTimer);
  currentTarget = null;
  if (tooltipEl) {
    tooltipEl.classList.remove('visible');
    tooltipEl.setAttribute('aria-hidden', 'true');
  }
}


/* ========== FILE: state.js ========== */
/**
 * @fileoverview NetShield Sim - State Management
 * Single source of truth with pub/sub architecture and undo/redo history.
 * Matches specifications in DESIGN.md and Prompt.
 */

/**
 * @typedef {'pc'|'router'|'server'} NodeType
 * @typedef {'online'|'disabled'} NodeStatus
 * @typedef {'up'|'down'} LinkStatus
 * @typedef {'select'|'add-pc'|'add-router'|'add-server'|'link'|'delete'} ToolType
 * @typedef {'healthy'|'degraded'|'under-attack'|'protected'} NetworkHealth
 */

const initialState = {
  name: 'Office Network',
  nodes: [],
  links: [],
  firewallRules: [],
  alerts: [],
  logs: [],
  ui: {
    tool: 'select',
    selected: null, // { type: 'node'|'link', id: string } | null
    speed: 'normal', // 'slow'|'normal'|'fast'
    activeTab: 'inspector', // 'inspector'|'routing'|'security'|'logs'
    autoDefense: true,
    compareRoutes: false,
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    lastComputedRoute: null, // { path, totalCost, hops, stepDetails }
    previousRoute: null
  },
  sim: {
    packets: [],
    attack: null, // { type: 'flood'|'scan', sourceId, targetId, intensity, timerId } | null
    trafficRps: 0,
    scannedPortsCount: 0,
    deliveredPacketsCount: 0,
    health: 'healthy'
  }
};

let state = JSON.parse(JSON.stringify(initialState));
const listeners = new Set();

// Undo / Redo History for topology snapshots
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 30;

/**
 * Returns a shallow copy / snapshot of current state
 */
function getState() {
  return state;
}

/**
 * Subscribes a listener function to state changes.
 * @param {(state: typeof initialState, event?: { type: string, payload: any }) => void} listener 
 * @returns {() => void} Unsubscribe function
 */
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notifies all subscribers of a state change.
 * @param {string} [type='STATE_CHANGED'] 
 * @param {any} [payload] 
 */
function notify(type = 'STATE_CHANGED', payload = null) {
  for (const listener of listeners) {
    try {
      listener(state, { type, payload });
    } catch (err) {
      console.error('State subscriber error:', err);
    }
  }
}

/**
 * Takes a snapshot of the current topology for Undo history.
 */
function pushHistory() {
  const snapshot = {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    links: JSON.parse(JSON.stringify(state.links)),
    name: state.name
  };
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack.length = 0; // Clear redo on new action
  notify('HISTORY_CHANGED');
}

/**
 * Reverts to the previous topology state.
 */
function undo() {
  if (undoStack.length === 0) return false;
  const currentSnapshot = {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    links: JSON.parse(JSON.stringify(state.links)),
    name: state.name
  };
  redoStack.push(currentSnapshot);

  const prev = undoStack.pop();
  state.nodes = prev.nodes;
  state.links = prev.links;
  state.name = prev.name;
  state.ui.selected = null;
  notify('TOPOLOGY_CHANGED');
  notify('HISTORY_CHANGED');
  addLog('network', 'Reverted last topology change (Undo).');
  return true;
}

/**
 * Re-applies an undone topology state.
 */
function redo() {
  if (redoStack.length === 0) return false;
  const currentSnapshot = {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    links: JSON.parse(JSON.stringify(state.links)),
    name: state.name
  };
  undoStack.push(currentSnapshot);

  const next = redoStack.pop();
  state.nodes = next.nodes;
  state.links = next.links;
  state.name = next.name;
  state.ui.selected = null;
  notify('TOPOLOGY_CHANGED');
  notify('HISTORY_CHANGED');
  addLog('network', 'Re-applied topology change (Redo).');
  return true;
}

function canUndo() {
  return undoStack.length > 0;
}

function canRedo() {
  return redoStack.length > 0;
}

/**
 * Updates partial UI state.
 * @param {Partial<typeof initialState.ui>} updates 
 */
function updateUI(updates) {
  state.ui = { ...state.ui, ...updates };
  notify('UI_CHANGED', updates);
}

/**
 * Updates partial simulation state.
 * @param {Partial<typeof initialState.sim>} updates 
 */
function updateSim(updates) {
  state.sim = { ...state.sim, ...updates };
  notify('SIM_CHANGED', updates);
}

/**
 * Replaces the entire topology with new nodes, links, and optional name.
 * @param {{ nodes: any[], links: any[], name?: string, firewallRules?: any[] }} topology 
 */
function setTopology(topology) {
  pushHistory();
  state.nodes = topology.nodes || [];
  state.links = topology.links || [];
  if (topology.name) state.name = topology.name;
  if (topology.firewallRules) state.firewallRules = topology.firewallRules;
  state.ui.selected = null;
  state.ui.lastComputedRoute = null;
  state.ui.previousRoute = null;
  recomputeHealth();
  notify('TOPOLOGY_CHANGED');
}

/**
 * Clears the canvas.
 */
function clearTopology() {
  pushHistory();
  state.nodes = [];
  state.links = [];
  state.ui.selected = null;
  state.ui.lastComputedRoute = null;
  state.ui.previousRoute = null;
  recomputeHealth();
  notify('TOPOLOGY_CHANGED');
}

/**
 * Appends a log entry.
 * @param {'all'|'packets'|'network'|'security'} category 
 * @param {string} message 
 */
function addLog(category, message) {
  const log = {
    id: generateId('log'),
    category,
    message,
    ts: Date.now()
  };
  state.logs.unshift(log);
  if (state.logs.length > 200) state.logs.pop();
  notify('LOG_ADDED', log);
}

/**
 * Clears all logs.
 */
function clearLogs() {
  state.logs = [];
  notify('LOGS_CLEARED');
}

/**
 * Adds a security alert.
 * @param {{ type: string, severity: 'warning'|'critical', nodeId?: string, message: string }} alert 
 * @returns {string} Alert ID
 */
function addAlert(alert) {
  const newAlert = {
    id: generateId('alert'),
    mitigated: false,
    ts: Date.now(),
    ...alert
  };
  state.alerts.unshift(newAlert);
  recomputeHealth();
  notify('ALERT_ADDED', newAlert);
  addLog('security', `[${alert.severity.toUpperCase()}] ${alert.message}`);
  return newAlert.id;
}

/**
 * Updates an alert's status.
 * @param {string} alertId 
 * @param {Partial<typeof initialState.alerts[0]>} updates 
 */
function updateAlert(alertId, updates) {
  const alert = state.alerts.find(a => a.id === alertId);
  if (alert) {
    Object.assign(alert, updates);
    recomputeHealth();
    notify('ALERT_UPDATED', alert);
  }
}

/**
 * Recomputes the overall network health status based on attacks, alerts, and link states.
 */
function recomputeHealth() {
  let health = 'healthy';
  const hasActiveAttack = Boolean(state.sim.attack);
  const hasCriticalUnmitigated = state.alerts.some(a => a.severity === 'critical' && !a.mitigated);
  const hasWarningUnmitigated = state.alerts.some(a => a.severity === 'warning' && !a.mitigated);
  const hasCutLinksOrDisabledNodes = state.links.some(l => l.status === 'down') || state.nodes.some(n => n.status === 'disabled');
  const hasMitigatedRules = state.firewallRules.some(r => r.enabled);

  if (hasActiveAttack || hasCriticalUnmitigated) {
    health = 'under-attack';
  } else if (hasMitigatedRules && state.nodes.some(n => n.blocked)) {
    health = 'protected';
  } else if (hasWarningUnmitigated || hasCutLinksOrDisabledNodes) {
    health = 'degraded';
  } else {
    health = 'healthy';
  }

  if (state.sim.health !== health) {
    state.sim.health = health;
    notify('HEALTH_CHANGED', health);
  }
}

/**
 * Node helper: find node by id
 * @param {string} id 
 */
function getNode(id) {
  return state.nodes.find(n => n.id === id);
}

/**
 * Link helper: find link by id
 * @param {string} id 
 */
function getLink(id) {
  return state.links.find(l => l.id === id);
}

/**
 * Returns all links connected to a specific node id.
 * @param {string} nodeId 
 */
function getLinksForNode(nodeId) {
  return state.links.filter(l => l.source === nodeId || l.target === nodeId);
}


/* ========== FILE: storage.js ========== */
/**
 * @fileoverview NetShield Sim - Storage & Persistence Engine
 * LocalStorage slots, JSON import/export, schema validation, and autosave.
 * Matches DESIGN.md §6 and Prompt specifications.
 */

const STORAGE_KEY_SLOTS = 'netshield_saved_topologies';
const STORAGE_KEY_AUTOSAVE = 'netshield_autosave_session';
const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let autosaveTimer = null;
let lastAutosaveTime = null;

/**
 * Validates topology object against the strict schema.
 * @param {any} data 
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateTopologyJSON(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'The file does not contain a valid network configuration object.' };
  }

  if (!Array.isArray(data.nodes)) {
    return { valid: false, error: 'Invalid configuration: missing "nodes" list.' };
  }

  if (!Array.isArray(data.links)) {
    return { valid: false, error: 'Invalid configuration: missing "links" list.' };
  }

  const validTypes = new Set(['pc', 'router', 'server']);
  const nodeIds = new Set();

  for (let i = 0; i < data.nodes.length; i++) {
    const node = data.nodes[i];
    if (!node || typeof node !== 'object') {
      return { valid: false, error: `Device #${i + 1} is invalid.` };
    }
    if (!node.id || typeof node.id !== 'string') {
      return { valid: false, error: `Device #${i + 1} has a missing or invalid ID.` };
    }
    if (nodeIds.has(node.id)) {
      return { valid: false, error: `Duplicate device ID detected: "${node.id}".` };
    }
    nodeIds.add(node.id);

    if (!validTypes.has(node.type)) {
      return { valid: false, error: `Device "${node.label || node.id}" has unknown type "${node.type}". Allowed: Computer, Router, Server.` };
    }

    if (node.ip) {
      const ipCheck = validateIPv4(node.ip);
      if (!ipCheck.valid) {
        return { valid: false, error: `Device "${node.label || node.id}" has an invalid IP address: ${node.ip}` };
      }
    }

    if (typeof node.x !== 'number' || typeof node.y !== 'number') {
      return { valid: false, error: `Device "${node.label || node.id}" is missing valid canvas positions (x, y).` };
    }
  }

  const linkIds = new Set();
  for (let i = 0; i < data.links.length; i++) {
    const link = data.links[i];
    if (!link || typeof link !== 'object') {
      return { valid: false, error: `Cable #${i + 1} is invalid.` };
    }
    if (!link.id || typeof link.id !== 'string') {
      return { valid: false, error: `Cable #${i + 1} is missing an ID.` };
    }
    if (linkIds.has(link.id)) {
      return { valid: false, error: `Duplicate cable ID detected: "${link.id}".` };
    }
    linkIds.add(link.id);

    if (!nodeIds.has(link.source)) {
      return { valid: false, error: `Cable "${link.id}" connects to non-existent source device "${link.source}".` };
    }
    if (!nodeIds.has(link.target)) {
      return { valid: false, error: `Cable "${link.id}" connects to non-existent target device "${link.target}".` };
    }
    if (link.source === link.target) {
      return { valid: false, error: `Cable "${link.id}" cannot connect a device to itself.` };
    }
  }

  return { valid: true, error: null };
}

/**
 * Saves current topology to a named slot in localStorage.
 * @param {string} slotName 
 * @returns {boolean}
 */
function saveTopologyToSlot(slotName) {
  try {
    const state = getState();
    const topologies = getSavedTopologies();

    const entry = {
      name: slotName.trim() || state.name,
      savedAt: new Date().toISOString(),
      nodeCount: state.nodes.length,
      linkCount: state.links.length,
      topology: {
        name: slotName.trim() || state.name,
        nodes: state.nodes,
        links: state.links,
        firewallRules: state.firewallRules
      }
    };

    topologies[slotName] = entry;
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(topologies));
    addLog('network', `Topology saved to slot "${slotName}".`);
    showToast(`Saved "${slotName}" successfully.`, 'success');
    return true;
  } catch (err) {
    console.error('Save error:', err);
    showToast('Failed to save topology to browser storage.', 'danger');
    return false;
  }
}

/**
 * Gets all saved topologies.
 * @returns {Record<string, any>}
 */
function getSavedTopologies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Loads a topology from a named slot.
 * @param {string} slotName 
 * @returns {boolean}
 */
function loadTopologyFromSlot(slotName) {
  const topologies = getSavedTopologies();
  const entry = topologies[slotName];
  if (!entry || !entry.topology) {
    showToast(`Could not find saved topology "${slotName}".`, 'warning');
    return false;
  }

  const validation = validateTopologyJSON(entry.topology);
  if (!validation.valid) {
    showToast(`Corrupted save data: ${validation.error}`, 'danger');
    return false;
  }

  setTopology(entry.topology);
  addLog('network', `Loaded topology "${slotName}".`);
  showToast(`Loaded "${slotName}" successfully.`, 'success');
  return true;
}

/**
 * Deletes a saved topology slot.
 * @param {string} slotName 
 */
function deleteTopologySlot(slotName) {
  const topologies = getSavedTopologies();
  if (topologies[slotName]) {
    delete topologies[slotName];
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(topologies));
    showToast(`Deleted slot "${slotName}".`, 'info');
    return true;
  }
  return false;
}

/**
 * Exports current topology as a downloadable JSON file.
 */
function exportTopologyFile() {
  const state = getState();
  const data = {
    name: state.name,
    exportedAt: new Date().toISOString(),
    nodes: state.nodes,
    links: state.links,
    firewallRules: state.firewallRules
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (state.name || 'topology').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  a.download = `${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  addLog('network', `Exported configuration to ${safeName}.json.`);
  showToast('Network configuration downloaded.', 'success');
}

/**
 * Imports a topology from a file input element.
 * @param {File} file 
 * @returns {Promise<boolean>}
 */
function importTopologyFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const check = validateTopologyJSON(parsed);
        if (!check.valid) {
          showToast(`Cannot import file: ${check.error}`, 'danger', 6000);
          resolve(false);
          return;
        }

        setTopology(parsed);
        addLog('network', `Imported configuration from file "${file.name}".`);
        showToast(`Successfully loaded "${file.name}".`, 'success');
        resolve(true);
      } catch (err) {
        showToast('The selected file is not valid JSON.', 'danger');
        resolve(false);
      }
    };
    reader.onerror = () => {
      showToast('Error reading the selected file.', 'danger');
      resolve(false);
    };
    reader.readAsText(file);
  });
}

/**
 * Performs an autosave of current topology and logs.
 */
function performAutosave() {
  try {
    const state = getState();
    const autosaveData = {
      name: state.name,
      savedAt: new Date().toISOString(),
      nodes: state.nodes,
      links: state.links,
      firewallRules: state.firewallRules,
      logs: state.logs.slice(0, 50)
    };

    localStorage.setItem(STORAGE_KEY_AUTOSAVE, JSON.stringify(autosaveData));
    lastAutosaveTime = new Date();
    updateAutosaveDisplay();
    notify('AUTOSAVED');
  } catch (err) {
    console.warn('Autosave failed:', err);
  }
}

/**
 * Checks for a previous autosaved session.
 * @returns {any|null}
 */
function getAutosavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTOSAVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Restores an autosaved session.
 */
function restoreAutosavedSession() {
  const session = getAutosavedSession();
  if (!session) return false;

  const check = validateTopologyJSON(session);
  if (check.valid) {
    setTopology(session);
    addLog('network', 'Restored previous session from autosave.');
    showToast('Previous session restored.', 'info');
    return true;
  }
  return false;
}

/**
 * Updates the autosave time in the status bar.
 */
function updateAutosaveDisplay() {
  const el = document.getElementById('statusbar-autosave');
  if (el && lastAutosaveTime) {
    el.textContent = `Autosave on · last saved ${formatTime(lastAutosaveTime, false)}`;
  }
}

/**
 * Initializes the autosave interval and beforeunload hooks.
 */
function initAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);

  autosaveTimer = setInterval(() => {
    performAutosave();
  }, AUTOSAVE_INTERVAL_MS);

  window.addEventListener('beforeunload', () => {
    performAutosave();
  });

  lastAutosaveTime = new Date();
  updateAutosaveDisplay();
}


/* ========== FILE: tutorial.js ========== */
/**
 * @fileoverview NetShield Sim - 5-Minute Guided Tutorial
 * 6-step interactive walkthrough with spotlight cutouts and coachmarks.
 * Matches DESIGN.md §6.11 and Prompt specifications.
 */

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: '1. Add Devices to Your Network',
    text: 'Click on a device icon (Computer, Router, or Server) on the left toolbar, then click anywhere on the canvas to place it.',
    targetSelector: '#tool-add-pc',
    tab: 'inspector'
  },
  {
    step: 2,
    title: '2. Connect Devices with Cables',
    text: 'Select the Link Tool (cable icon), then click one device and click a second device to connect them with a virtual cable.',
    targetSelector: '#tool-link',
    tab: 'inspector'
  },
  {
    step: 3,
    title: '3. Send a Packet via Dijkstra',
    text: 'Open the Routing tab, select a Source and Destination, and press "Send Packet". Dijkstra\'s algorithm will find the cheapest path and animate the packet!',
    targetSelector: '#tab-btn-routing',
    tab: 'routing'
  },
  {
    step: 4,
    title: '4. Fault Tolerance: Cut a Cable',
    text: 'Click any cable or device, then choose "Cut Cable" or "Switch Off" in the Inspector tab. When you send a packet again, the network will automatically re-route around the break!',
    targetSelector: '#tab-btn-inspector',
    tab: 'inspector'
  },
  {
    step: 5,
    title: '5. Launch a Simulated Attack',
    text: 'In the Security tab, pick an attacker (like PC-3) and a target server, then click "Start Attack" to simulate high-volume DoS traffic or a port scan.',
    targetSelector: '#tab-btn-security',
    tab: 'security'
  },
  {
    step: 6,
    title: '6. Watch Automated Defense',
    text: 'When traffic exceeds safe thresholds, our security engine detects the attack, triggers an alert, and applies a firewall rule to block the attacker.',
    targetSelector: '#tab-btn-security',
    tab: 'security'
  }
];

let currentStepIndex = 0;
let overlayEl = null;
let spotlightEl = null;
let coachmarkEl = null;

/**
 * Initializes the tutorial system.
 */
function initTutorial() {
  createTutorialDOM();

  // Check if first-time visitor
  const seen = typeof localStorage !== 'undefined' ? localStorage.getItem('netshield_tutorial_seen') : 'true';
  if (!seen) {
    showWelcomeModal();
  }
}

/**
 * Displays the initial Welcome Modal.
 */
function showWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.classList.add('open');
  }
}

/**
 * Closes the Welcome Modal.
 */
function closeWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.classList.remove('open');
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('netshield_tutorial_seen', 'true');
  }
}

/**
 * Starts the 6-step guided walkthrough.
 */
function startTutorial() {
  closeWelcomeModal();
  currentStepIndex = 0;
  if (!overlayEl) createTutorialDOM();
  overlayEl.classList.add('active');
  renderStep(currentStepIndex);
}

/**
 * Ends the tutorial.
 */
function endTutorial() {
  if (overlayEl) {
    overlayEl.classList.remove('active');
  }
  if (spotlightEl) spotlightEl.style.display = 'none';
  if (coachmarkEl) coachmarkEl.style.display = 'none';
  localStorage.setItem('netshield_tutorial_seen', 'true');
}

function createTutorialDOM() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'tutorial-overlay';

  spotlightEl = document.createElement('div');
  spotlightEl.className = 'tutorial-spotlight-rect';

  coachmarkEl = document.createElement('div');
  coachmarkEl.className = 'tutorial-coachmark';

  overlayEl.appendChild(spotlightEl);
  overlayEl.appendChild(coachmarkEl);
  document.body.appendChild(overlayEl);
}

function renderStep(index) {
  const stepData = TUTORIAL_STEPS[index];
  if (!stepData) {
    endTutorial();
    return;
  }

  // Switch to corresponding tab if needed
  if (stepData.tab) {
    updateUI({ activeTab: stepData.tab });
  }

  // Highlight target element
  const target = document.querySelector(stepData.targetSelector);
  if (target) {
    const rect = target.getBoundingClientRect();
    spotlightEl.style.display = 'block';
    spotlightEl.style.top = `${rect.top - 6}px`;
    spotlightEl.style.left = `${rect.left - 6}px`;
    spotlightEl.style.width = `${rect.width + 12}px`;
    spotlightEl.style.height = `${rect.height + 12}px`;
  } else {
    spotlightEl.style.display = 'none';
  }

  // Build coachmark content
  coachmarkEl.innerHTML = `
    <div class="coachmark-step">Step ${stepData.step} of ${TUTORIAL_STEPS.length}</div>
    <div class="coachmark-title">${stepData.title}</div>
    <div class="coachmark-body">${stepData.text}</div>
    <div class="coachmark-actions">
      <button class="btn btn-secondary btn-sm" id="tutorial-skip-btn">Skip Tour</button>
      <div style="display: flex; gap: 8px;">
        ${index > 0 ? '<button class="btn btn-secondary btn-sm" id="tutorial-back-btn">Back</button>' : ''}
        <button class="btn btn-primary btn-sm" id="tutorial-next-btn">${index === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}</button>
      </div>
    </div>
  `;

  coachmarkEl.style.display = 'block';

  // Position coachmark intelligently near spotlight or in center
  if (target) {
    const rect = target.getBoundingClientRect();
    let top = rect.bottom + 16;
    let left = rect.left;

    if (left + 340 > window.innerWidth) {
      left = window.innerWidth - 360;
    }
    if (top + 220 > window.innerHeight) {
      top = rect.top - 230;
    }
    if (top < 10) top = 80;

    coachmarkEl.style.top = `${Math.round(top)}px`;
    coachmarkEl.style.left = `${Math.max(16, Math.round(left))}px`;
  } else {
    coachmarkEl.style.top = '50%';
    coachmarkEl.style.left = '50%';
    coachmarkEl.style.transform = 'translate(-50%, -50%)';
  }

  // Event handlers
  document.getElementById('tutorial-skip-btn').addEventListener('click', endTutorial);
  document.getElementById('tutorial-next-btn').addEventListener('click', () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      currentStepIndex++;
      renderStep(currentStepIndex);
    } else {
      endTutorial();
    }
  });

  const backBtn = document.getElementById('tutorial-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        renderStep(currentStepIndex);
      }
    });
  }
}


/* ========== FILE: topology.js ========== */
/**
 * @fileoverview NetShield Sim - Topology Builder Module
 * Device creation, cable management, grid snapping, deletion, and auto-naming.
 * Matches DESIGN.md §6.3, §6.4 and Prompt §1 specifications.
 */

let nodeCounters = {
  pc: 0,
  router: 0,
  server: 0
};

/**
 * Generates an auto-incremented label and unique IP for a new node.
 * @param {'pc'|'router'|'server'} type 
 * @returns {{ label: string, ip: string }}
 */
function generateNodeIdentity(type) {
  const state = getState();
  const existingNodes = state.nodes;

  if (type === 'pc') {
    let index = 1;
    while (existingNodes.some(n => n.label === `PC-${index}`)) index++;
    return {
      label: `PC-${index}`,
      ip: `192.168.1.${10 + index - 1}`
    };
  } else if (type === 'router') {
    let index = 1;
    while (existingNodes.some(n => n.label === `R${index}`)) index++;
    return {
      label: `R${index}`,
      ip: `192.168.${index}.1`
    };
  } else {
    let index = 1;
    while (existingNodes.some(n => n.label === `Server-${index}`)) index++;
    return {
      label: `Server-${index}`,
      ip: `10.0.0.${10 + index - 1}`
    };
  }
}

/**
 * Adds a new device to the network topology.
 * @param {'pc'|'router'|'server'} type 
 * @param {number} rawX 
 * @param {number} rawY 
 * @returns {object} The created node
 */
function addNode(type, rawX, rawY) {
  pushHistory();
  const state = getState();
  const { label, ip } = generateNodeIdentity(type);

  const x = snapToGrid(rawX, 10);
  const y = snapToGrid(rawY, 10);

  const node = {
    id: generateId(`node-${type}`),
    label,
    type,
    ip,
    x,
    y,
    status: 'online',
    blocked: false
  };

  state.nodes.push(node);
  updateUI({ selected: { type: 'node', id: node.id } });

  addLog('network', `Added ${label} (${type.toUpperCase()}) at [${x}, ${y}].`);
  showToast(`Added ${label} to the network.`, 'info');

  recomputeHealth();
  notify('NODE_ADDED', node);
  return node;
}

/**
 * Moves a node to new coordinates with 10px grid snap.
 * @param {string} nodeId 
 * @param {number} rawX 
 * @param {number} rawY 
 */
function moveNode(nodeId, rawX, rawY) {
  const node = getNode(nodeId);
  if (!node) return;

  node.x = snapToGrid(rawX, 10);
  node.y = snapToGrid(rawY, 10);

  notify('NODE_MOVED', node);
}

/**
 * Creates a cable (link) between two nodes.
 * @param {string} sourceId 
 * @param {string} targetId 
 * @param {number} [cost=2] 
 * @param {number} [bandwidth=100] 
 * @returns {object|null} The created link or null on error
 */
function addLink(sourceId, targetId, cost = 2, bandwidth = 100) {
  const state = getState();

  if (!sourceId || !targetId) return null;

  if (sourceId === targetId) {
    showToast('A device cannot connect to itself.', 'warning');
    return null;
  }

  const srcNode = getNode(sourceId);
  const dstNode = getNode(targetId);

  if (!srcNode || !dstNode) {
    showToast('Cannot connect missing devices.', 'danger');
    return null;
  }

  // Check for existing link between these two nodes
  const existing = state.links.find(
    l => (l.source === sourceId && l.target === targetId) ||
         (l.source === targetId && l.target === sourceId)
  );

  if (existing) {
    showToast(`A cable already connects ${srcNode.label} and ${dstNode.label}.`, 'warning');
    return null;
  }

  pushHistory();

  const link = {
    id: generateId('link'),
    source: sourceId,
    target: targetId,
    cost: Math.max(1, Number(cost) || 2),
    bandwidth: Number(bandwidth) || 100,
    status: 'up'
  };

  state.links.push(link);
  updateUI({ selected: { type: 'link', id: link.id } });

  addLog('network', `Connected ${srcNode.label} and ${dstNode.label} (Cost: ${link.cost}, ${link.bandwidth} Mbps).`);
  showToast(`Connected ${srcNode.label} to ${dstNode.label}.`, 'success');

  recomputeHealth();
  notify('LINK_ADDED', link);
  return link;
}

/**
 * Deletes a node and all cables attached to it.
 * @param {string} nodeId 
 * @returns {boolean}
 */
function deleteNode(nodeId) {
  const state = getState();
  const nodeIndex = state.nodes.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) return false;

  pushHistory();
  const [node] = state.nodes.splice(nodeIndex, 1);

  // Remove attached links
  const removedLinks = [];
  for (let i = state.links.length - 1; i >= 0; i--) {
    const l = state.links[i];
    if (l.source === nodeId || l.target === nodeId) {
      removedLinks.push(state.links.splice(i, 1)[0]);
    }
  }

  // Clear selection if deleted
  if (state.ui.selected && state.ui.selected.id === nodeId) {
    updateUI({ selected: null });
  }

  addLog('network', `Deleted ${node.label} (${removedLinks.length} connected cables removed).`);
  showToast(`Deleted ${node.label}.`, 'info');

  recomputeHealth();
  notify('TOPOLOGY_CHANGED');
  return true;
}

/**
 * Deletes a link cable.
 * @param {string} linkId 
 * @returns {boolean}
 */
function deleteLink(linkId) {
  const state = getState();
  const linkIndex = state.links.findIndex(l => l.id === linkId);
  if (linkIndex === -1) return false;

  pushHistory();
  const [link] = state.links.splice(linkIndex, 1);

  if (state.ui.selected && state.ui.selected.id === linkId) {
    updateUI({ selected: null });
  }

  const srcNode = getNode(link.source);
  const dstNode = getNode(link.target);
  const srcName = srcNode ? srcNode.label : link.source;
  const dstName = dstNode ? dstNode.label : link.target;

  addLog('network', `Deleted cable between ${srcName} and ${dstName}.`);
  showToast(`Deleted cable between ${srcName} and ${dstName}.`, 'info');

  recomputeHealth();
  notify('TOPOLOGY_CHANGED');
  return true;
}

/**
 * Updates a node's properties (label, IP).
 * @param {string} nodeId 
 * @param {Partial<object>} updates 
 */
function updateNodeProperties(nodeId, updates) {
  const node = getNode(nodeId);
  if (!node) return;

  if (updates.label !== undefined) {
    const check = validateName(updates.label);
    if (!check.valid) {
      showToast(check.error, 'danger');
      return;
    }
    node.label = updates.label.trim();
  }

  if (updates.ip !== undefined) {
    const check = validateIPv4(updates.ip);
    if (!check.valid) {
      showToast(check.error, 'danger');
      return;
    }
    node.ip = updates.ip.trim();
  }

  addLog('network', `Updated properties for device ${node.label}.`);
  showToast(`Updated ${node.label}.`, 'success');
  notify('NODE_UPDATED', node);
}

/**
 * Updates a link's properties (cost, bandwidth).
 * @param {string} linkId 
 * @param {Partial<object>} updates 
 */
function updateLinkProperties(linkId, updates) {
  const link = getLink(linkId);
  if (!link) return;

  if (updates.cost !== undefined) {
    const cost = Math.max(1, Math.min(50, Number(updates.cost) || 1));
    link.cost = cost;
  }

  if (updates.bandwidth !== undefined) {
    link.bandwidth = Math.max(10, Number(updates.bandwidth) || 100);
  }

  addLog('network', `Updated cable properties (Cost: ${link.cost}, Bandwidth: ${link.bandwidth} Mbps).`);
  showToast('Cable properties updated.', 'success');
  notify('LINK_UPDATED', link);
}


/* ========== FILE: faults.js ========== */
/**
 * @fileoverview NetShield Sim - Fault Tolerance Module
 * Cable cuts, device shutdown/restore, and dynamic reroute recalculation.
 * Matches DESIGN.md §4 specifications.
 */

/**
 * Toggles a cable's status between 'up' and 'down'.
 * @param {string} linkId 
 * @returns {boolean} New status ('up' or 'down')
 */
function toggleCableStatus(linkId) {
  const link = getLink(linkId);
  if (!link) return false;

  pushHistory();
  const isCurrentlyUp = link.status !== 'down';
  link.status = isCurrentlyUp ? 'down' : 'up';

  const srcNode = getNode(link.source);
  const dstNode = getNode(link.target);
  const srcName = srcNode ? srcNode.label : link.source;
  const dstName = dstNode ? dstNode.label : link.target;

  if (link.status === 'down') {
    addLog('network', `Cable cut: link between ${srcName} and ${dstName} disconnected.`);
    showToast(`Cable between ${srcName} and ${dstName} has been cut.`, 'warning');
  } else {
    addLog('network', `Cable restored: link between ${srcName} and ${dstName} reconnected.`);
    showToast(`Cable between ${srcName} and ${dstName} has been restored.`, 'success');
  }

  recomputeHealth();
  checkAndRerouteActivePath();
  notify('LINK_UPDATED', link);
  return link.status;
}

/**
 * Toggles a device's status between 'online' and 'disabled'.
 * @param {string} nodeId 
 * @returns {boolean} New status ('online' or 'disabled')
 */
function toggleNodePower(nodeId) {
  const node = getNode(nodeId);
  if (!node) return false;

  pushHistory();
  const isCurrentlyOnline = node.status !== 'disabled';
  node.status = isCurrentlyOnline ? 'disabled' : 'online';

  if (node.status === 'disabled') {
    addLog('network', `Device switched off: ${node.label} (${node.ip}) is now offline.`);
    showToast(`${node.label} has been switched off.`, 'warning');
  } else {
    addLog('network', `Device powered on: ${node.label} (${node.ip}) is now online.`);
    showToast(`${node.label} has been powered on.`, 'success');
  }

  recomputeHealth();
  checkAndRerouteActivePath();
  notify('NODE_UPDATED', node);
  return node.status;
}

/**
 * Checks if the currently displayed path was affected by a fault, and triggers Dijkstra re-calculation.
 */
function checkAndRerouteActivePath() {
  const state = getState();
  const currentRoute = state.ui.lastComputedRoute;
  if (!currentRoute || !currentRoute.path || currentRoute.path.length < 2) return;

  const srcId = currentRoute.path[0];
  const dstId = currentRoute.path[currentRoute.path.length - 1];

  const newRoute = findShortestPath(state.nodes, state.links, srcId, dstId);

  if (newRoute) {
    const isDifferent = JSON.stringify(newRoute.path) !== JSON.stringify(currentRoute.path);
    if (isDifferent) {
      state.ui.previousRoute = currentRoute;
      state.ui.lastComputedRoute = newRoute;
      showToast('Path recalculated due to network change.', 'info');
      addLog('network', `Rerouted path: ${newRoute.path.map(id => getNode(id)?.label || id).join(' → ')} (Cost: ${newRoute.totalCost}).`);
      notify('ROUTE_RECOMPUTED', newRoute);
    }
  } else {
    state.ui.previousRoute = currentRoute;
    state.ui.lastComputedRoute = null;
    showToast('No working path to the destination due to cable or device fault.', 'danger');
    addLog('network', 'Path disconnected: destination is now unreachable.');
    notify('ROUTE_LOST');
  }
}


/* ========== FILE: packets.js ========== */
/**
 * @fileoverview NetShield Sim - Packet Animation Engine
 * Multi-packet transit simulation with requestAnimationFrame,
 * dynamic mid-flight re-routing, arrival rings, and failure pulses.
 * Matches DESIGN.md §6.5, §7 and Prompt specifications.
 */

let activePackets = [];
let animFrameId = null;
let lastTimestamp = performance.now();

// Hop duration mappings in milliseconds
const SPEED_MAP = {
  slow: 1000,
  normal: 600,
  fast: 250
};

/**
 * Creates and launches a regular network packet along a computed path.
 * @param {string[]} path - Array of node IDs [src, hop1, ..., dst]
 * @param {number} totalCost 
 * @param {object} [options] 
 * @returns {string} Packet ID
 */
function sendPacket(path, totalCost, options = {}) {
  if (!path || path.length < 2) return null;

  const state = getState();
  const speed = state.ui.speed || 'normal';
  const hopDuration = SPEED_MAP[speed] || 600;

  const packet = {
    id: generateId('pkt'),
    type: options.type || 'data', // 'data' | 'flood' | 'scan'
    path: [...path],
    originalPath: [...path],
    currentHopIndex: 0,
    progress: 0, // 0 to 1 between current hop and next hop
    hopDuration,
    sourceId: path[0],
    targetId: path[path.length - 1],
    totalCost,
    port: options.port || null,
    x: 0,
    y: 0,
    history: []
  };

  const startNode = getNode(packet.path[0]);
  if (startNode) {
    packet.x = startNode.x;
    packet.y = startNode.y;
    packet.history = [{ x: startNode.x, y: startNode.y }];
  }

  activePackets.push(packet);

  if (!options.silent) {
    const srcNode = getNode(packet.sourceId);
    const dstNode = getNode(packet.targetId);
    const srcLabel = srcNode ? srcNode.label : packet.sourceId;
    const dstLabel = dstNode ? dstNode.label : packet.targetId;
    addLog('packets', `Packet sent: ${srcLabel} → ${dstLabel} (${packet.path.length - 1} hops, cost: ${totalCost}).`);
  }

  startAnimationLoop();
  return packet.id;
}

/**
 * Starts the global animation loop if not already running.
 */
function startAnimationLoop() {
  if (!animFrameId) {
    lastTimestamp = performance.now();
    animFrameId = requestAnimationFrame(animationTick);
  }
}

/**
 * Main animation loop tick.
 * @param {number} currentTimestamp 
 */
function animationTick(currentTimestamp) {
  const deltaMs = Math.min(100, currentTimestamp - lastTimestamp);
  lastTimestamp = currentTimestamp;

  const state = getState();
  const speed = state.ui.speed || 'normal';
  const defaultHopDuration = SPEED_MAP[speed] || 600;

  for (let i = activePackets.length - 1; i >= 0; i--) {
    const pkt = activePackets[i];
    pkt.hopDuration = defaultHopDuration;

    const fromNodeId = pkt.path[pkt.currentHopIndex];
    const toNodeId = pkt.path[pkt.currentHopIndex + 1];

    const fromNode = getNode(fromNodeId);
    const toNode = getNode(toNodeId);

    // Mid-flight fault tolerance check:
    // Verify whether the cable or target node is down/disabled!
    let linkDown = false;
    let nodeDown = !toNode || toNode.status === 'disabled';

    if (!nodeDown) {
      const link = state.links.find(
        l => (l.source === fromNodeId && l.target === toNodeId) ||
             (l.source === toNodeId && l.target === fromNodeId)
      );
      if (!link || link.status === 'down') {
        linkDown = true;
      }
    }

    if (linkDown || nodeDown) {
      // Mid-flight failure! Attempt dynamic re-routing from current hop (fromNodeId)
      const reroute = findShortestPath(state.nodes, state.links, fromNodeId, pkt.targetId);

      if (reroute && reroute.path.length >= 2) {
        showToast('A cable was cut, finding a new route...', 'warning');
        addLog('network', `Dynamic re-routing: packet redirected from ${fromNode.label} via alternate path.`);
        
        // Update path from current position
        pkt.path = reroute.path;
        pkt.currentHopIndex = 0;
        pkt.progress = 0;
        continue;
      } else {
        // No alternate path exists: drop packet and flash failure ring
        triggerFailureEffect(fromNode.x, fromNode.y);
        showToast('No working path to the destination. Try restoring a cable.', 'danger');
        addLog('packets', `Packet dropped at ${fromNode.label}: destination unreachable.`);
        activePackets.splice(i, 1);
        continue;
      }
    }

    // Normal progression along hop
    const progressStep = deltaMs / pkt.hopDuration;
    pkt.progress += progressStep;

    if (pkt.progress >= 1.0) {
      // Reached next node
      pkt.currentHopIndex++;
      pkt.progress = 0;

      if (pkt.currentHopIndex >= pkt.path.length - 1) {
        // Arrived at destination!
        handlePacketArrival(pkt);
        activePackets.splice(i, 1);
        continue;
      }
    }

    // Interpolate current coordinates
    const curFromNode = getNode(pkt.path[pkt.currentHopIndex]);
    const curToNode = getNode(pkt.path[pkt.currentHopIndex + 1]);

    if (curFromNode && curToNode) {
      pkt.x = lerp(curFromNode.x, curToNode.x, pkt.progress);
      pkt.y = lerp(curFromNode.y, curToNode.y, pkt.progress);

      if (!pkt.history) pkt.history = [];
      pkt.history.push({ x: pkt.x, y: pkt.y });
      if (pkt.history.length > 6) {
        pkt.history.shift();
      }
    }
  }

  // Render packet layers on SVG
  renderPacketsSVG(activePackets);

  if (activePackets.length > 0) {
    animFrameId = requestAnimationFrame(animationTick);
  } else {
    animFrameId = null;
  }
}

/**
 * Handles successful packet delivery.
 * @param {object} pkt 
 */
function handlePacketArrival(pkt) {
  const targetNode = getNode(pkt.targetId);
  const srcNode = getNode(pkt.sourceId);

  if (targetNode) {
    triggerArrivalEffect(targetNode.x, targetNode.y);
  }

  if (pkt.type === 'data') {
    const state = getState();
    state.sim.deliveredPacketsCount = (state.sim.deliveredPacketsCount || 0) + 1;
    notify('SIM_CHANGED');

    const srcName = srcNode ? srcNode.label : pkt.sourceId;
    const dstName = targetNode ? targetNode.label : pkt.targetId;
    const hops = pkt.path.length - 1;
    showToast(`Packet delivered to ${dstName} in ${hops} hop${hops > 1 ? 's' : ''} (cost: ${pkt.totalCost}).`, 'success');
    addLog('packets', `Delivered: ${srcName} → ${dstName} (${hops} hops).`);
  }
}

/**
 * Triggers green expanding arrival pulse SVG ring.
 * @param {number} x 
 * @param {number} y 
 */
function triggerArrivalEffect(x, y) {
  const layer = document.getElementById('effects-layer');
  if (!layer) return;

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', x);
  circle.setAttribute('cy', y);
  circle.setAttribute('r', '44');
  circle.setAttribute('class', 'packet-arrival-ring');

  layer.appendChild(circle);
  setTimeout(() => {
    if (circle.parentNode) circle.parentNode.removeChild(circle);
  }, 750);
}

/**
 * Triggers red failure flash SVG ring.
 * @param {number} x 
 * @param {number} y 
 */
function triggerFailureEffect(x, y) {
  const layer = document.getElementById('effects-layer');
  if (!layer) return;

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', x);
  circle.setAttribute('cy', y);
  circle.setAttribute('r', '44');
  circle.setAttribute('class', 'packet-failure-ring');

  layer.appendChild(circle);
  setTimeout(() => {
    if (circle.parentNode) circle.parentNode.removeChild(circle);
  }, 750);
}

/**
 * Renders all active packets onto the SVG packets layer with trailing dots.
 * @param {Array<object>} packets 
 */
function renderPacketsSVG(packets) {
  const container = document.getElementById('packets-layer');
  if (!container) return;

  // Clear existing packets
  container.innerHTML = '';

  for (const pkt of packets) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'packet-group');

    // Render trailing dots
    if (pkt.history && pkt.history.length > 1) {
      const trailCount = pkt.history.length - 1;
      for (let h = 0; h < trailCount; h++) {
        const pt = pkt.history[h];
        const ratio = (h + 1) / trailCount;
        const trailDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        trailDot.setAttribute('cx', pt.x);
        trailDot.setAttribute('cy', pt.y);
        trailDot.setAttribute('r', (2.5 + ratio * 5.5).toFixed(1));
        const trailColor = pkt.type === 'flood' ? 'var(--attack-pulse)' : (pkt.type === 'scan' ? 'var(--probe-color)' : 'var(--packet)');
        trailDot.setAttribute('fill', trailColor);
        trailDot.setAttribute('opacity', (ratio * 0.45).toFixed(2));
        g.appendChild(trailDot);
      }
    }

    // Main packet circle (12px teal circle with white outline)
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pkt.x);
    circle.setAttribute('cy', pkt.y);

    if (pkt.type === 'flood') {
      circle.setAttribute('r', '7');
      circle.setAttribute('class', 'packet-circle packet-attack');
    } else if (pkt.type === 'scan') {
      circle.setAttribute('r', '7');
      circle.setAttribute('class', 'packet-circle packet-probe');
    } else {
      circle.setAttribute('r', '11');
      circle.setAttribute('class', 'packet-circle');
    }

    g.appendChild(circle);
    container.appendChild(g);
  }
}

/**
 * Clears all active packets immediately.
 */
function clearAllPackets() {
  activePackets = [];
  const container = document.getElementById('packets-layer');
  if (container) container.innerHTML = '';
}


/* ========== FILE: security.js ========== */
/**
 * @fileoverview NetShield Sim - Security & Attack Simulation Engine
 * DoS Flood, Port Scan, Traffic Metering, Anomaly Detection, and Automated Firewall Defense.
 * Matches DESIGN.md §2.2, §6.6 and Prompt §5 specifications.
 */

let attackTimer = null;
let trafficMeterTimer = null;
let defenseTimeout = null;

const FLOOD_THRESHOLD_RPS = 100;
const SCAN_THRESHOLD_PORTS = 15;

const COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 119, 123, 143, 161, 194, 443, 445, 993, 995, 3306, 3389, 5432, 8080, 8443];

/**
 * Starts an attack simulation.
 * @param {{ type: 'flood'|'scan', sourceId: string, targetId: string, intensity: 'low'|'medium'|'high' }} config 
 * @returns {boolean}
 */
function startAttack({ type = 'flood', sourceId, targetId, intensity = 'medium' }) {
  stopAttack(); // Stop any existing attack

  const state = getState();
  const attackerNode = getNode(sourceId);
  const targetNode = getNode(targetId);

  if (!attackerNode || !targetNode) {
    showToast('Please select both an attacker device and a target server.', 'warning');
    return false;
  }

  if (attackerNode.status === 'disabled') {
    showToast('The attacker device is switched off.', 'warning');
    return false;
  }

  if (targetNode.status === 'disabled') {
    showToast('The target server is switched off.', 'warning');
    return false;
  }

  if (attackerNode.blocked) {
    showToast(`${attackerNode.label} is currently blocked by the firewall. Unblock it to test attacks.`, 'warning');
    return false;
  }

  const route = findShortestPath(state.nodes, state.links, sourceId, targetId);
  if (!route) {
    showToast('No working route exists between the attacker and the target server.', 'danger');
    return false;
  }

  // Set attack state
  updateSim({
    attack: {
      type,
      sourceId,
      targetId,
      intensity,
      startTime: Date.now()
    },
    trafficRps: 0,
    scannedPortsCount: 0
  });

  recomputeHealth();
  notify('ATTACK_STARTED', { type, sourceId, targetId });

  const attackerName = attackerNode.label;
  const targetName = targetNode.label;

  if (type === 'flood') {
    startFloodSimulation(attackerNode, targetNode, route, intensity);
  } else {
    startPortScanSimulation(attackerNode, targetNode, route, intensity);
  }

  return true;
}

/**
 * Executes a simulated DoS Flood.
 */
function startFloodSimulation(attacker, target, route, intensity) {
  const rpsMap = { low: 60, medium: 140, high: 280 };
  const targetRps = rpsMap[intensity] || 140;
  const packetIntervalMs = intensity === 'high' ? 30 : (intensity === 'medium' ? 60 : 100);

  addLog('security', `[SIMULATION] Flood attack initiated from ${attacker.label} targeting ${target.label}.`);
  showToast(`Simulated flood attack started on ${target.label}.`, 'danger');

  let currentRps = 0;
  let alertTriggered = false;
  let alertId = null;

  // Stream packets
  attackTimer = setInterval(() => {
    const currentState = getState();
    if (!currentState.sim.attack || attacker.blocked) {
      stopAttack();
      return;
    }

    sendPacket(route.path, route.totalCost, { type: 'flood', silent: true });
  }, packetIntervalMs);

  // Meter update loop
  trafficMeterTimer = setInterval(() => {
    const currentState = getState();
    if (!currentState.sim.attack) return;

    // Ramp up RPS smoothly
    currentRps = Math.min(targetRps, currentRps + Math.floor(Math.random() * 25) + 15);
    updateSim({ trafficRps: currentRps });

    // Detection Check
    if (currentRps >= FLOOD_THRESHOLD_RPS && !alertTriggered) {
      alertTriggered = true;
      alertId = addAlert({
        type: 'flood',
        severity: 'critical',
        nodeId: target.id,
        message: `Too much traffic (${currentRps} req/s) is hitting ${target.label}. This looks like a flood attack from ${attacker.label}.`
      });

      // Automated Defense
      if (currentState.ui.autoDefense) {
        showToast('Anomaly detected! Automated defense will engage in 2 seconds...', 'warning');
        defenseTimeout = setTimeout(() => {
          applyFirewallBlock(attacker.id, alertId, 'Automated defense rule: Flood DoS mitigation.');
        }, 2000);
      } else {
        showToast(`Critical flood detected on ${target.label}! Auto-defense is OFF. Click "Block Now" to mitigate.`, 'danger', 6000);
      }
    }
  }, 200);
}

/**
 * Executes a simulated Port Scan.
 */
function startPortScanSimulation(attacker, target, route, intensity) {
  addLog('security', `[SIMULATION] Port scan initiated from ${attacker.label} towards ${target.label}.`);
  showToast(`Simulated port scan started on ${target.label}.`, 'warning');

  const intervalMs = intensity === 'high' ? 120 : (intensity === 'medium' ? 240 : 400);
  let portIndex = 0;
  let scannedCount = 0;
  let alertTriggered = false;
  let alertId = null;

  attackTimer = setInterval(() => {
    const currentState = getState();
    if (!currentState.sim.attack || attacker.blocked) {
      stopAttack();
      return;
    }

    const port = COMMON_PORTS[portIndex % COMMON_PORTS.length];
    portIndex++;
    scannedCount++;

    updateSim({
      scannedPortsCount: scannedCount,
      trafficRps: Math.floor(Math.random() * 8) + 2
    });

    sendPacket(route.path, route.totalCost, { type: 'scan', port, silent: true });

    // Detection Check: > 15 ports scanned
    if (scannedCount >= SCAN_THRESHOLD_PORTS && !alertTriggered) {
      alertTriggered = true;
      alertId = addAlert({
        type: 'scan',
        severity: 'warning',
        nodeId: target.id,
        message: `${attacker.label} is checking many doors (ports) on ${target.label}, which may be a snooping attempt.`
      });

      if (currentState.ui.autoDefense) {
        showToast('Port scan detected! Applying rate limit firewall in 2 seconds...', 'warning');
        defenseTimeout = setTimeout(() => {
          applyFirewallBlock(attacker.id, alertId, 'Automated defense rule: Suspicious port scan blocked.');
        }, 2000);
      } else {
        showToast(`Port scan detected on ${target.label}! Auto-defense is OFF. Click "Block Now" to mitigate.`, 'warning', 6000);
      }
    }
  }, intervalMs);
}

/**
 * Halts active attack simulation and resets traffic meters.
 */
function stopAttack() {
  if (attackTimer) {
    clearInterval(attackTimer);
    attackTimer = null;
  }
  if (trafficMeterTimer) {
    clearInterval(trafficMeterTimer);
    trafficMeterTimer = null;
  }
  if (defenseTimeout) {
    clearTimeout(defenseTimeout);
    defenseTimeout = null;
  }

  updateSim({
    attack: null,
    trafficRps: 0,
    scannedPortsCount: 0
  });

  recomputeHealth();
  notify('ATTACK_STOPPED');
}

/**
 * Applies a firewall rule to block or rate-limit a suspicious node.
 * @param {string} targetNodeId 
 * @param {string} [alertId] 
 * @param {string} [reason] 
 */
function applyFirewallBlock(targetNodeId, alertId = null, reason = 'Firewall block rule') {
  const state = getState();
  const node = getNode(targetNodeId);
  if (!node) return;

  // Mark node as blocked in state
  node.blocked = true;

  // Stop attack if this node was attacking
  if (state.sim.attack && state.sim.attack.sourceId === targetNodeId) {
    stopAttack();
  }

  // Create firewall rule entry
  const existingRule = state.firewallRules.find(r => r.targetNodeId === targetNodeId);
  if (!existingRule) {
    const rule = {
      id: generateId('rule'),
      targetNodeId,
      targetLabel: node.label,
      targetIp: node.ip,
      action: 'DROP (Block)',
      enabled: true,
      reason,
      createdAt: new Date().toISOString()
    };
    state.firewallRules.unshift(rule);
  }

  // Update alert status if linked
  if (alertId) {
    updateAlert(alertId, {
      mitigated: true,
      mitigationText: `Protected: ${node.label} was blocked.`
    });
  } else {
    // Mitigate any open alerts from this node
    state.alerts.forEach(a => {
      if (!a.mitigated && a.message.includes(node.label)) {
        updateAlert(a.id, {
          mitigated: true,
          mitigationText: `Protected: ${node.label} was blocked.`
        });
      }
    });
  }

  addLog('security', `[FIREWALL] Rule applied: ${node.label} (${node.ip}) has been blocked by the firewall.`);
  showToast(`Firewall rule applied: ${node.label} has been blocked.`, 'success');

  recomputeHealth();
  notify('FIREWALL_RULES_UPDATED');
  notify('NODE_UPDATED', node);
}

/**
 * Toggles a firewall rule's enabled status.
 * @param {string} ruleId 
 */
function toggleFirewallRule(ruleId) {
  const state = getState();
  const rule = state.firewallRules.find(r => r.id === ruleId);
  if (!rule) return;

  rule.enabled = !rule.enabled;
  const node = getNode(rule.targetNodeId);
  if (node) {
    node.blocked = rule.enabled;
    notify('NODE_UPDATED', node);
  }

  addLog('security', `Firewall rule ${rule.id} ${rule.enabled ? 'enabled' : 'disabled'}.`);
  showToast(`Firewall rule ${rule.enabled ? 'activated' : 'deactivated'}.`, 'info');
  recomputeHealth();
  notify('FIREWALL_RULES_UPDATED');
}

/**
 * Removes a firewall rule.
 * @param {string} ruleId 
 */
function removeFirewallRule(ruleId) {
  const state = getState();
  const index = state.firewallRules.findIndex(r => r.id === ruleId);
  if (index === -1) return;

  const [rule] = state.firewallRules.splice(index, 1);
  const node = getNode(rule.targetNodeId);
  if (node) {
    node.blocked = false;
    notify('NODE_UPDATED', node);
  }

  addLog('security', `Firewall rule for ${rule.targetLabel} removed.`);
  showToast(`Firewall rule removed. ${rule.targetLabel} is unblocked.`, 'info');
  recomputeHealth();
  notify('FIREWALL_RULES_UPDATED');
}


/* ========== FILE: canvas.js ========== */
/**
 * @fileoverview NetShield Sim - SVG Canvas Interaction Engine
 * Zoom, Pan, Drag-and-Drop, Cable Creation, Context Menus, and SVG rendering.
 * Matches DESIGN.md §5, §6.3, §6.4 and Prompt specifications.
 */

let svgEl = null;
let worldGroupEl = null;
let linksLayerEl = null;
let nodesLayerEl = null;
let packetsLayerEl = null;
let effectsLayerEl = null;
let tempLineEl = null;

// Pan and Zoom variables
let isPanning = false;
let startPanMouse = { x: 0, y: 0 };
let currentPan = { x: 0, y: 0 };
let currentZoom = 1.0;

// Node Dragging variables
let isDraggingNode = false;
let draggedNodeId = null;
let dragOffset = { x: 0, y: 0 };
let nodeDidMove = false;

// Link Creation state
let pendingLinkSourceId = null;

/**
 * Initializes the SVG canvas interactions.
 */
function initCanvas() {
  svgEl = document.getElementById('topology-svg');
  worldGroupEl = document.getElementById('canvas-world');
  linksLayerEl = document.getElementById('links-layer');
  nodesLayerEl = document.getElementById('nodes-layer');
  packetsLayerEl = document.getElementById('packets-layer');
  effectsLayerEl = document.getElementById('effects-layer');
  tempLineEl = document.getElementById('temp-link-line');

  if (!svgEl) return;

  setupCanvasEvents();
  setupKeyboardNavigation();
  setupContextMenu();
  renderCanvas();
}

/**
 * Renders the entire SVG canvas: links, nodes, selection states, route highlights.
 */
function renderCanvas() {
  const state = getState();
  renderLinks(state);
  renderNodes(state);
  updateEmptyState(state);
  updateCanvasHint(state);
  updateTransform();
}

/**
 * Updates CSS transform for pan and zoom.
 */
function updateTransform() {
  if (worldGroupEl) {
    worldGroupEl.setAttribute('transform', `translate(${currentPan.x}, ${currentPan.y}) scale(${currentZoom})`);
  }
}

/**
 * Converts screen/mouse coordinates to SVG world coordinates.
 * @param {number} clientX 
 * @param {number} clientY 
 * @returns {{ x: number, y: number }}
 */
function screenToWorld(clientX, clientY) {
  const rect = svgEl.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  return {
    x: (screenX - currentPan.x) / currentZoom,
    y: (screenY - currentPan.y) / currentZoom
  };
}

/**
 * Zooms by a scale delta around the center or cursor.
 * @param {number} delta 
 */
function zoomCanvas(delta) {
  const oldZoom = currentZoom;
  currentZoom = clamp(currentZoom + delta, 0.5, 2.0);

  const rect = svgEl.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  currentPan.x = cx - (cx - currentPan.x) * (currentZoom / oldZoom);
  currentPan.y = cy - (cy - currentPan.y) * (currentZoom / oldZoom);

  updateTransform();
  updateUI({ zoom: currentZoom, pan: { ...currentPan } });
}

/**
 * Adjusts pan and zoom so all nodes fit comfortably on screen.
 */
function fitToScreen() {
  const state = getState();
  if (state.nodes.length === 0) {
    currentPan = { x: 0, y: 0 };
    currentZoom = 1.0;
    updateTransform();
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of state.nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }

  const padding = 100;
  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(100, maxX - minX + padding * 2);
  const height = Math.max(100, maxY - minY + padding * 2);

  const scaleX = rect.width / width;
  const scaleY = rect.height / height;
  currentZoom = clamp(Math.min(scaleX, scaleY), 0.5, 1.4);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  currentPan.x = rect.width / 2 - centerX * currentZoom;
  currentPan.y = rect.height / 2 - centerY * currentZoom;

  updateTransform();
  updateUI({ zoom: currentZoom, pan: { ...currentPan } });
  showToast('Fitted network to screen.', 'info');
}

/**
 * Renders network links (cables).
 */
function renderLinks(state) {
  if (!linksLayerEl) return;
  linksLayerEl.innerHTML = '';

  const activePathLinkIds = new Set(state.ui.lastComputedRoute ? state.ui.lastComputedRoute.linkIds : []);
  const oldPathLinkIds = new Set(
    state.ui.compareRoutes && state.ui.previousRoute ? state.ui.previousRoute.linkIds : []
  );

  for (const link of state.links) {
    const srcNode = getNode(link.source);
    const dstNode = getNode(link.target);
    if (!srcNode || !dstNode) continue;

    const isSelected = state.ui.selected && state.ui.selected.type === 'link' && state.ui.selected.id === link.id;
    const isDown = link.status === 'down';
    const isActiveRoute = activePathLinkIds.has(link.id);
    const isOldRoute = !isActiveRoute && oldPathLinkIds.has(link.id);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `link-group ${isSelected ? 'selected' : ''} ${isDown ? 'link-down' : ''} ${isActiveRoute ? 'active-route' : ''} ${isOldRoute ? 'old-route' : ''}`);
    g.setAttribute('data-link-id', link.id);

    // Glow line for active route
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    glow.setAttribute('x1', srcNode.x);
    glow.setAttribute('y1', srcNode.y);
    glow.setAttribute('x2', dstNode.x);
    glow.setAttribute('y2', dstNode.y);
    glow.setAttribute('class', 'link-glow');

    // Invisible hit area for easier clicking
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hit.setAttribute('x1', srcNode.x);
    hit.setAttribute('y1', srcNode.y);
    hit.setAttribute('x2', dstNode.x);
    hit.setAttribute('y2', dstNode.y);
    hit.setAttribute('class', 'link-hitarea');

    // Visible cable line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', srcNode.x);
    line.setAttribute('y1', srcNode.y);
    line.setAttribute('x2', dstNode.x);
    line.setAttribute('y2', dstNode.y);
    line.setAttribute('class', 'link-line');

    g.appendChild(glow);
    g.appendChild(hit);
    g.appendChild(line);

    // Midpoint calculations for badges and cut markers
    const midX = (srcNode.x + dstNode.x) / 2;
    const midY = (srcNode.y + dstNode.y) / 2;

    if (isDown) {
      // Cut Cable ✕ Marker
      const cutMarker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      cutMarker.setAttribute('x', midX);
      cutMarker.setAttribute('y', midY);
      cutMarker.setAttribute('class', 'link-cut-marker');
      cutMarker.textContent = '✕';
      g.appendChild(cutMarker);
    } else {
      // Cost Pill Badge
      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('transform', `translate(${midX}, ${midY})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '-16');
      rect.setAttribute('y', '-12');
      rect.setAttribute('width', '32');
      rect.setAttribute('height', '24');
      rect.setAttribute('rx', '12');
      rect.setAttribute('ry', '12');
      rect.setAttribute('class', 'link-cost-bg');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '0');
      text.setAttribute('y', '0');
      text.setAttribute('class', 'link-cost-text');
      text.textContent = link.cost;

      badgeG.appendChild(rect);
      badgeG.appendChild(text);
      g.appendChild(badgeG);
    }

    // Click on link
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.ui.tool === 'delete') {
        deleteLink(link.id);
      } else {
        updateUI({ selected: { type: 'link', id: link.id }, activeTab: 'inspector' });
      }
    });

    linksLayerEl.appendChild(g);
  }
}

/**
 * Generates the clean vector device icon matching the video.
 * Drawn using pure SVG primitives centered at (0, 0) inside the 88px square tile.
 * @param {string} type - 'pc' | 'router' | 'server'
 * @returns {string} SVG inner markup
 */
function getNodeDeviceIconSVG(type) {
  if (type === 'router') {
    return `
      <rect x="-24" y="2" width="48" height="20" rx="6" fill="currentColor"/>
      <line x1="-14" y1="2" x2="-18" y2="-18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="-18" cy="-19" r="3.2" fill="currentColor"/>
      <line x1="14" y1="2" x2="18" y2="-18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="18" cy="-19" r="3.2" fill="currentColor"/>
      <circle cx="-12" cy="12" r="2.6" fill="#FFFFFF"/>
      <circle cx="0" cy="12" r="2.6" fill="#FFFFFF"/>
      <circle cx="12" cy="12" r="2.6" fill="#FFFFFF"/>
    `;
  } else if (type === 'server') {
    return `
      <rect x="-22" y="-22" width="44" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="3.2"/>
      <circle cx="-12" cy="-12.5" r="2.6" fill="currentColor"/>
      <line x1="2" y1="-12.5" x2="14" y2="-12.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="-22" y="3" width="44" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="3.2"/>
      <circle cx="-12" cy="12.5" r="2.6" fill="currentColor"/>
      <line x1="2" y1="12.5" x2="14" y2="12.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
    `;
  } else {
    // Computer / PC
    return `
      <rect x="-22" y="-20" width="44" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="3.2"/>
      <line x1="0" y1="8" x2="0" y2="18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="-12" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
    `;
  }
}

/**
 * Renders network nodes (88px rounded square tiles with soft shadow).
 */
function renderNodes(state) {
  if (!nodesLayerEl) return;
  nodesLayerEl.innerHTML = '';

  const underAttackNodeId = state.sim.attack ? state.sim.attack.targetId : null;

  for (const node of state.nodes) {
    const isSelected = state.ui.selected && state.ui.selected.type === 'node' && state.ui.selected.id === node.id;
    const isDisabled = node.status === 'disabled';
    const isUnderAttack = underAttackNodeId === node.id;
    const isBlocked = Boolean(node.blocked);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `node-group type-${node.type} ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${isUnderAttack ? 'under-attack' : ''}`);
    g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    g.setAttribute('data-node-id', node.id);

    // 1. Soft shadow underneath tile
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    shadow.setAttribute('x', '-44');
    shadow.setAttribute('y', '-38');
    shadow.setAttribute('width', '88');
    shadow.setAttribute('height', '88');
    shadow.setAttribute('rx', '20');
    shadow.setAttribute('class', 'node-shadow-rect');
    g.appendChild(shadow);

    // 2. Halo ring for selection & hover
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    halo.setAttribute('x', '-48');
    halo.setAttribute('y', '-48');
    halo.setAttribute('width', '96');
    halo.setAttribute('height', '96');
    halo.setAttribute('rx', '24');
    halo.setAttribute('class', 'node-halo');
    g.appendChild(halo);

    // 3. Attack pulsing ring if target of attack
    if (isUnderAttack) {
      const attackRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      attackRect.setAttribute('x', '-47');
      attackRect.setAttribute('y', '-47');
      attackRect.setAttribute('width', '94');
      attackRect.setAttribute('height', '94');
      attackRect.setAttribute('rx', '24');
      attackRect.setAttribute('class', 'node-attack-rect');
      g.appendChild(attackRect);
    }

    // 4. Node Tile (88px White Rounded Square)
    const tile = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    tile.setAttribute('x', '-44');
    tile.setAttribute('y', '-44');
    tile.setAttribute('width', '88');
    tile.setAttribute('height', '88');
    tile.setAttribute('rx', '20');
    tile.setAttribute('class', 'node-tile');
    g.appendChild(tile);

    // 5. Inner Device Icon (Clean vector icon centered inside 88px square tile)
    const iconG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    iconG.setAttribute('class', 'node-icon-group');
    iconG.innerHTML = getNodeDeviceIconSVG(node.type);
    g.appendChild(iconG);

    // 6. Top Label: Device Name
    const labelTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelTitle.setAttribute('y', '-56');
    labelTitle.setAttribute('class', 'node-label-title');
    labelTitle.textContent = node.label;
    g.appendChild(labelTitle);

    // 7. Bottom Label: Monospace IP
    const labelIp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelIp.setAttribute('y', '64');
    labelIp.setAttribute('class', 'node-label-ip');
    labelIp.textContent = node.ip;
    g.appendChild(labelIp);

    // 8. Online dot or status badge
    if (!isDisabled && !isBlocked) {
      const dotWhite = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dotWhite.setAttribute('cx', '36');
      dotWhite.setAttribute('cy', '-36');
      dotWhite.setAttribute('r', '9');
      dotWhite.setAttribute('fill', '#FFFFFF');
      g.appendChild(dotWhite);

      const dotGreen = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dotGreen.setAttribute('cx', '36');
      dotGreen.setAttribute('cy', '-36');
      dotGreen.setAttribute('r', '6');
      dotGreen.setAttribute('fill', '#22C55E');
      g.appendChild(dotGreen);
    } else if (isBlocked) {
      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('transform', 'translate(24, -48)');
      badgeG.setAttribute('class', 'node-badge');
      badgeG.innerHTML = `
        <circle cx="12" cy="12" r="12" fill="#FFFFFF"/>
        <circle cx="12" cy="12" r="10" fill="#DC2626"/>
        <path d="M12 18s5-2.5 5-6.5V6.5l-5-2-5 2v5c0 4 5 6.5 5 6.5z" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
        <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
      `;
      g.appendChild(badgeG);
    } else if (isDisabled) {
      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('transform', 'translate(24, -48)');
      badgeG.setAttribute('class', 'node-badge');
      badgeG.innerHTML = `
        <circle cx="12" cy="12" r="12" fill="#FFFFFF"/>
        <circle cx="12" cy="12" r="10" fill="#5F7480"/>
        <path d="M14.5 9.5a4.5 4.5 0 1 1-5 0" fill="none" stroke="#FFFFFF" stroke-width="1.75" stroke-linecap="round"/>
        <line x1="12" y1="7" x2="12" y2="12" stroke="#FFFFFF" stroke-width="1.75" stroke-linecap="round"/>
      `;
      g.appendChild(badgeG);
    }

    // Node Interaction Events
    setupNodeEvents(g, node);

    nodesLayerEl.appendChild(g);
  }
}

/**
 * Attaches drag, click, and link-creation events to a node group.
 */
function setupNodeEvents(el, node) {
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    const state = getState();

    if (state.ui.tool === 'link') {
      e.stopPropagation();
      handleLinkToolClick(node.id);
      return;
    }

    if (state.ui.tool === 'delete') {
      e.stopPropagation();
      deleteNode(node.id);
      return;
    }

    // Start dragging node in select tool
    e.stopPropagation();
    isDraggingNode = true;
    draggedNodeId = node.id;
    nodeDidMove = false;

    const world = screenToWorld(e.clientX, e.clientY);
    dragOffset.x = world.x - node.x;
    dragOffset.y = world.y - node.y;

    updateUI({ selected: { type: 'node', id: node.id }, activeTab: 'inspector' });
  });
}

/**
 * Handles Link Tool two-click cable connection.
 * @param {string} clickedNodeId 
 */
function handleLinkToolClick(clickedNodeId) {
  if (!pendingLinkSourceId) {
    pendingLinkSourceId = clickedNodeId;
    const src = getNode(clickedNodeId);
    showToast(`First device selected: ${src?.label}. Now click the second device.`, 'info');
    updateCanvasHint(getState(), `Connecting from ${src?.label}... Click target device (Esc to cancel)`);
  } else {
    const srcId = pendingLinkSourceId;
    pendingLinkSourceId = null;
    hideTempLine();

    if (srcId === clickedNodeId) {
      showToast('A device cannot connect to itself.', 'warning');
      return;
    }

    addLink(srcId, clickedNodeId);
  }
}

function showTempLine(x1, y1, x2, y2) {
  if (tempLineEl) {
    tempLineEl.setAttribute('x1', x1);
    tempLineEl.setAttribute('y1', y1);
    tempLineEl.setAttribute('x2', x2);
    tempLineEl.setAttribute('y2', y2);
    tempLineEl.style.display = 'block';
  }
}

function hideTempLine() {
  if (tempLineEl) {
    tempLineEl.style.display = 'none';
  }
}

/**
 * Canvas DOM Event listeners: pan, zoom, click-to-add, background click.
 */
function setupCanvasEvents() {
  svgEl.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.target === svgEl)) {
      // Middle click or clicking canvas background starts panning
      isPanning = true;
      startPanMouse = { x: e.clientX, y: e.clientY };
    }
  });

  window.addEventListener('mousemove', (e) => {
    // 1. Panning canvas
    if (isPanning) {
      const dx = e.clientX - startPanMouse.x;
      const dy = e.clientY - startPanMouse.y;
      startPanMouse = { x: e.clientX, y: e.clientY };
      currentPan.x += dx;
      currentPan.y += dy;
      updateTransform();
      return;
    }

    // 2. Dragging node
    if (isDraggingNode && draggedNodeId) {
      nodeDidMove = true;
      const world = screenToWorld(e.clientX, e.clientY);
      moveNode(draggedNodeId, world.x - dragOffset.x, world.y - dragOffset.y);
      renderCanvas();
      return;
    }

    // 3. Link Tool temp line follow
    if (pendingLinkSourceId) {
      const srcNode = getNode(pendingLinkSourceId);
      if (srcNode) {
        const world = screenToWorld(e.clientX, e.clientY);
        showTempLine(srcNode.x, srcNode.y, world.x, world.y);
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (isPanning) {
      isPanning = false;
      updateUI({ pan: { ...currentPan } });
    }

    if (isDraggingNode) {
      if (nodeDidMove) {
        pushHistory(); // Register move in undo stack
      }
      isDraggingNode = false;
      draggedNodeId = null;
    }
  });

  // Canvas Click (Add Node or Deselect)
  svgEl.addEventListener('click', (e) => {
    if (e.target !== svgEl) return;
    const state = getState();

    // If link creation was pending, cancel it on empty click
    if (pendingLinkSourceId) {
      pendingLinkSourceId = null;
      hideTempLine();
      showToast('Cable creation cancelled.', 'info');
      updateCanvasHint(state);
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    if (state.ui.tool === 'add-pc') {
      addNode('pc', world.x, world.y);
    } else if (state.ui.tool === 'add-router') {
      addNode('router', world.x, world.y);
    } else if (state.ui.tool === 'add-server') {
      addNode('server', world.x, world.y);
    } else {
      // Clear selection
      updateUI({ selected: null });
    }
  });

  // Zoom via mouse wheel
  svgEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    zoomCanvas(zoomDelta);
  }, { passive: false });
}

/**
 * Sets up keyboard operations: Delete key, Esc, Arrow keys.
 */
function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    // Avoid interfering when typing in inputs
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    const state = getState();

    // Esc cancels active tool / pending link / clears selection
    if (e.key === 'Escape') {
      if (pendingLinkSourceId) {
        pendingLinkSourceId = null;
        hideTempLine();
        showToast('Cable creation cancelled.', 'info');
      }
      updateUI({ tool: 'select', selected: null });
      return;
    }

    // Delete or Backspace removes selection
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.ui.selected) {
        e.preventDefault();
        if (state.ui.selected.type === 'node') {
          deleteNode(state.ui.selected.id);
        } else if (state.ui.selected.type === 'link') {
          deleteLink(state.ui.selected.id);
        }
      }
      return;
    }

    // Arrow keys nudge selected node by 10px
    if (state.ui.selected && state.ui.selected.type === 'node') {
      const node = getNode(state.ui.selected.id);
      if (!node) return;

      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp') dy = -10;
      else if (e.key === 'ArrowDown') dy = 10;
      else if (e.key === 'ArrowLeft') dx = -10;
      else if (e.key === 'ArrowRight') dx = 10;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        moveNode(node.id, node.x + dx, node.y + dy);
        renderCanvas();
      }
    }
  });
}

/**
 * Sets up right-click context menu.
 */
function setupContextMenu() {
  const menu = document.getElementById('context-menu');
  if (!menu) return;

  svgEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const targetNodeEl = e.target.closest('[data-node-id]');
    const targetLinkEl = e.target.closest('[data-link-id]');

    let itemsHtml = '';
    const world = screenToWorld(e.clientX, e.clientY);

    if (targetNodeEl) {
      const nodeId = targetNodeEl.getAttribute('data-node-id');
      const node = getNode(nodeId);
      if (!node) return;

      updateUI({ selected: { type: 'node', id: node.id } });
      const isOnline = node.status !== 'disabled';

      itemsHtml = `
        <button class="menu-item" id="ctx-power">${getIcon('power')} ${isOnline ? 'Switch Off' : 'Power On'}</button>
        <button class="menu-item" id="ctx-inspect">${getIcon('info')} Inspect Properties</button>
        <div class="menu-separator"></div>
        <button class="menu-item danger" id="ctx-delete">${getIcon('trash')} Delete Device</button>
      `;

      showContextMenu(menu, e.clientX, e.clientY, itemsHtml, () => {
        document.getElementById('ctx-power')?.addEventListener('click', () => {
          toggleNodePower(node.id);
          hideContextMenu(menu);
        });
        document.getElementById('ctx-inspect')?.addEventListener('click', () => {
          updateUI({ activeTab: 'inspector' });
          hideContextMenu(menu);
        });
        document.getElementById('ctx-delete')?.addEventListener('click', () => {
          deleteNode(node.id);
          hideContextMenu(menu);
        });
      });
    } else if (targetLinkEl) {
      const linkId = targetLinkEl.getAttribute('data-link-id');
      const link = getLink(linkId);
      if (!link) return;

      updateUI({ selected: { type: 'link', id: link.id } });
      const isUp = link.status !== 'down';

      itemsHtml = `
        <button class="menu-item" id="ctx-cable-cut">${getIcon('cable-cut')} ${isUp ? 'Cut Cable' : 'Restore Cable'}</button>
        <button class="menu-item" id="ctx-inspect">${getIcon('info')} Inspect Cable</button>
        <div class="menu-separator"></div>
        <button class="menu-item danger" id="ctx-delete">${getIcon('trash')} Delete Cable</button>
      `;

      showContextMenu(menu, e.clientX, e.clientY, itemsHtml, () => {
        document.getElementById('ctx-cable-cut')?.addEventListener('click', () => {
          toggleCableStatus(link.id);
          hideContextMenu(menu);
        });
        document.getElementById('ctx-inspect')?.addEventListener('click', () => {
          updateUI({ activeTab: 'inspector' });
          hideContextMenu(menu);
        });
        document.getElementById('ctx-delete')?.addEventListener('click', () => {
          deleteLink(link.id);
          hideContextMenu(menu);
        });
      });
    } else {
      // Background click
      itemsHtml = `
        <button class="menu-item" id="ctx-add-pc">${getIcon('monitor')} Add Computer</button>
        <button class="menu-item" id="ctx-add-router">${getIcon('router')} Add Router</button>
        <button class="menu-item" id="ctx-add-server">${getIcon('server')} Add Server</button>
        <div class="menu-separator"></div>
        <button class="menu-item" id="ctx-fit">${getIcon('fit')} Fit to Screen</button>
      `;

      showContextMenu(menu, e.clientX, e.clientY, itemsHtml, () => {
        document.getElementById('ctx-add-pc')?.addEventListener('click', () => {
          addNode('pc', world.x, world.y);
          hideContextMenu(menu);
        });
        document.getElementById('ctx-add-router')?.addEventListener('click', () => {
          addNode('router', world.x, world.y);
          hideContextMenu(menu);
        });
        document.getElementById('ctx-add-server')?.addEventListener('click', () => {
          addNode('server', world.x, world.y);
          hideContextMenu(menu);
        });
        document.getElementById('ctx-fit')?.addEventListener('click', () => {
          fitToScreen();
          hideContextMenu(menu);
        });
      });
    }
  });

  window.addEventListener('click', () => hideContextMenu(menu));
}

function showContextMenu(menu, x, y, html, bindFn) {
  menu.innerHTML = html;
  menu.style.display = 'block';

  const menuWidth = 180;
  const menuHeight = 160;
  let posX = x;
  let posY = y;

  if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 10;
  if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 10;

  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;

  if (bindFn) bindFn();
}

function hideContextMenu(menu) {
  if (menu) menu.style.display = 'none';
}

function updateEmptyState(state) {
  const emptyEl = document.getElementById('canvas-empty-state');
  if (!emptyEl) return;
  if (state.nodes.length === 0) {
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
  }
}

function updateCanvasHint(state, customText = null) {
  const hintEl = document.getElementById('canvas-hint-text');
  if (!hintEl) return;

  if (customText) {
    hintEl.innerHTML = customText;
    return;
  }

  const toolHints = {
    select: '<strong>Select Tool:</strong> Click to select devices or cables; drag devices to move.',
    'add-pc': '<strong>Add Computer:</strong> Click anywhere on the canvas to place a computer.',
    'add-router': '<strong>Add Router:</strong> Click anywhere on the canvas to place a router.',
    'add-server': '<strong>Add Server:</strong> Click anywhere on the canvas to place a server.',
    link: '<strong>Link Tool:</strong> Click two devices to connect them with a cable.',
    delete: '<strong>Delete Tool:</strong> Click any device or cable to remove it.'
  };

  hintEl.innerHTML = toolHints[state.ui.tool] || toolHints.select;
}


/* ========== FILE: cover.js ========== */
/**
 * @fileoverview NetShield Sim - Cover Opening Page
 * Animated network constellation background, hero branding, and workspace transition.
 * Matches the video's title card exactly.
 */

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
function initCoverPage() {
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
function hideCoverPage() {
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
function showCoverPage() {
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


/* ========== FILE: main.js ========== */
/**
 * @fileoverview NetShield Sim - Main Application Controller
 * UI Event wiring, tab coordination, Inspector/Routing/Security rendering, and bootstrap.
 * Matches DESIGN.md specifications.
 */

// Active log filter category
let currentLogFilter = 'all';

/**
 * Boots the application when DOM is ready.
 */
function bootstrap() {
  initCoverPage();
  initCanvas();
  initTooltips();
  initAutosave();
  initTutorial();
  bindHeaderEvents();
  bindToolbarEvents();
  bindPanelTabs();
  bindRoutingEvents();
  bindSecurityEvents();
  bindLogEvents();
  bindModalEvents();

  // State change subscription to update panels & status bar
  subscribe((state, event) => {
    handleStateChange(state, event);
  });

  // Initial load: restore autosaved session if exists, otherwise load sample topology
  const savedSession = getAutosavedSession();
  if (savedSession && savedSession.nodes && savedSession.nodes.length > 0) {
    restoreAutosavedSession();
    fitToScreen();
  } else {
    loadSampleTopology();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}

/**
 * Loads the bundled sample topology from data/sample-topology.json.
 */
async function loadSampleTopology() {
  try {
    const res = await fetch('data/sample-topology.json');
    if (res.ok) {
      const data = await res.json();
      setTopology(data);
      fitToScreen();
      addLog('network', 'Loaded example network topology (Office Network).');
      showToast('Example network loaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Could not load sample-topology.json via fetch, using default topology fallback:', err);
  }
  // Fallback for file:// protocol or fetch failure
  if (DEFAULT_TOPOLOGY) {
    setTopology(JSON.parse(JSON.stringify(DEFAULT_TOPOLOGY)));
    fitToScreen();
    addLog('network', 'Loaded example network topology (Office Network).');
    showToast('Example network loaded.', 'success');
  }
}

/**
 * Handles incoming state changes and refreshes dependent UI panels.
 */
function handleStateChange(state, event) {
  renderCanvas();
  updateStatusBar(state);
  updateAlertBanner(state);
  updateInspectorPanel(state);
  updateRoutingDropdowns(state);
  updateSecurityPanel(state);
  updateLogsPanel(state);
  updateUndoRedoButtons();
}

/**
 * Header event bindings: topology name, save, load, export, import, tutorial.
 */
function bindHeaderEvents() {
  const nameInput = document.getElementById('topology-name-input');
  if (nameInput) {
    nameInput.addEventListener('change', (e) => {
      const state = getState();
      state.name = e.target.value.trim() || 'Office Network';
      addLog('network', `Renamed topology to "${state.name}".`);
      showToast(`Topology renamed to "${state.name}".`, 'info');
    });
  }

  document.getElementById('load-example-btn')?.addEventListener('click', loadSampleTopology);
  document.getElementById('help-btn')?.addEventListener('click', startTutorial);

  document.getElementById('export-btn')?.addEventListener('click', exportTopologyFile);

  // Import file
  const fileInput = document.getElementById('import-file-input');
  document.getElementById('import-btn')?.addEventListener('click', () => {
    if (fileInput) fileInput.click();
  });

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        await importTopologyFile(e.target.files[0]);
        fitToScreen();
        fileInput.value = '';
      }
    });
  }

  // Save Modal open
  document.getElementById('save-btn')?.addEventListener('click', () => {
    const state = getState();
    const input = document.getElementById('save-slot-name');
    if (input) input.value = state.name;
    document.getElementById('save-modal')?.classList.add('open');
  });

  // Load Modal open
  document.getElementById('load-btn')?.addEventListener('click', () => {
    renderSavedTopologiesList();
    document.getElementById('load-modal')?.classList.add('open');
  });

  // Drawer Toggle for tablet
  document.getElementById('drawer-toggle-btn')?.addEventListener('click', () => {
    const panel = document.getElementById('right-panel');
    if (panel) panel.classList.toggle('drawer-open');
  });
}

/**
 * Toolbar tools: Select, Add PC, Router, Server, Link, Delete, Zoom, Fit, Undo, Redo.
 */
function bindToolbarEvents() {
  const tools = ['select', 'add-pc', 'add-router', 'add-server', 'link', 'delete'];

  tools.forEach(tool => {
    const btn = document.getElementById(`tool-${tool}`);
    if (btn) {
      btn.addEventListener('click', () => {
        tools.forEach(t => document.getElementById(`tool-${t}`)?.classList.remove('active'));
        btn.classList.add('active');
        updateUI({ tool });

        // Update canvas cursor class
        const svg = document.getElementById('topology-svg');
        if (svg) {
          svg.className.baseVal = `canvas-svg ${tool === 'link' ? 'tool-link' : (tool === 'delete' ? 'tool-delete' : (tool.startsWith('add') ? 'tool-add' : ''))}`;
        }
      });
    }
  });

  document.getElementById('tool-zoom-in')?.addEventListener('click', () => zoomCanvas(0.15));
  document.getElementById('tool-zoom-out')?.addEventListener('click', () => zoomCanvas(-0.15));
  document.getElementById('tool-fit')?.addEventListener('click', fitToScreen);

  document.getElementById('tool-undo')?.addEventListener('click', () => {
    if (canUndo()) undo();
  });

  document.getElementById('tool-redo')?.addEventListener('click', () => {
    if (canRedo()) redo();
  });
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('tool-undo');
  const redoBtn = document.getElementById('tool-redo');
  if (undoBtn) undoBtn.disabled = !canUndo();
  if (redoBtn) redoBtn.disabled = !canRedo();
}

/**
 * Right panel tabs: Inspector, Routing, Security, Event Log.
 */
function bindPanelTabs() {
  const tabs = ['inspector', 'routing', 'security', 'logs'];

  tabs.forEach(tab => {
    const btn = document.getElementById(`tab-btn-${tab}`);
    if (btn) {
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          document.getElementById(`tab-btn-${t}`)?.classList.remove('active');
          document.getElementById(`tab-content-${t}`)?.classList.remove('active');
        });
        btn.classList.add('active');
        document.getElementById(`tab-content-${tab}`)?.classList.add('active');
        updateUI({ activeTab: tab });
      });
    }
  });
}

/**
 * Inspector Panel: Renders Selected Node or Selected Link or Network Summary.
 */
function updateInspectorPanel(state) {
  const container = document.getElementById('tab-content-inspector');
  if (!container) return;

  const sel = state.ui.selected;

  if (sel && sel.type === 'node') {
    const node = getNode(sel.id);
    if (!node) {
      renderNetworkSummary(container, state);
      return;
    }

    const connectedLinks = getLinksForNode(node.id);
    const isOnline = node.status !== 'disabled';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${getIcon(node.type === 'server' ? 'server' : (node.type === 'router' ? 'router' : 'monitor'))} Device Properties</span>
          <span class="chip ${isOnline ? 'chip-success' : 'chip-warning'}">${isOnline ? 'Online' : 'Switched Off'}</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="insp-node-name">Device Name</label>
          <input type="text" id="insp-node-name" class="form-control" value="${escapeHTML(node.label)}" maxlength="20">
        </div>

        <div class="form-group">
          <label class="form-label" for="insp-node-ip">IP Address</label>
          <input type="text" id="insp-node-ip" class="form-control form-control-mono" value="${escapeHTML(node.ip)}">
        </div>

        <div class="form-group">
          <span class="form-label">Type: <strong style="color: var(--text-primary); text-transform: uppercase;">${node.type}</strong></span>
          <span class="form-help">Connected Cables: ${connectedLinks.length}</span>
        </div>

        ${node.blocked ? `
          <div style="margin: 8px 0; padding: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); border-radius: 6px; font-size: 12px; color: var(--danger); display: flex; align-items: center; gap: 6px;">
            ${getIcon('shield-x')} <strong>Blocked:</strong> Firewall rule active on this device.
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn btn-secondary btn-full" id="insp-btn-power">
            ${getIcon('power')} ${isOnline ? 'Switch Off' : 'Power On'}
          </button>
          <button class="btn btn-danger btn-full" id="insp-btn-delete">
            ${getIcon('trash')} Delete
          </button>
        </div>
      </div>
    `;

    document.getElementById('insp-node-name')?.addEventListener('change', (e) => {
      updateNodeProperties(node.id, { label: e.target.value });
    });

    document.getElementById('insp-node-ip')?.addEventListener('change', (e) => {
      updateNodeProperties(node.id, { ip: e.target.value });
    });

    document.getElementById('insp-btn-power')?.addEventListener('click', () => {
      toggleNodePower(node.id);
    });

    document.getElementById('insp-btn-delete')?.addEventListener('click', () => {
      deleteNode(node.id);
    });

  } else if (sel && sel.type === 'link') {
    const link = getLink(sel.id);
    if (!link) {
      renderNetworkSummary(container, state);
      return;
    }

    const srcNode = getNode(link.source);
    const dstNode = getNode(link.target);
    const isUp = link.status !== 'down';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${getIcon('link')} Cable Properties</span>
          <span class="chip ${isUp ? 'chip-success' : 'chip-danger'}">${isUp ? 'Connected' : 'Cable Cut'}</span>
        </div>

        <div class="form-group">
          <span class="form-label">Endpoints</span>
          <div style="font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); padding: 6px 0;">
            ${srcNode?.label || link.source} ↔ ${dstNode?.label || link.target}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="insp-link-cost">Dijkstra Cost (1 - 50)</label>
          <input type="number" id="insp-link-cost" class="form-control" min="1" max="50" value="${link.cost}">
          <span class="form-help">Lower cost cables are preferred by Dijkstra's algorithm.</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="insp-link-bw">Bandwidth</label>
          <select id="insp-link-bw" class="form-control">
            <option value="100" ${link.bandwidth === 100 ? 'selected' : ''}>100 Mbps (Fast Ethernet)</option>
            <option value="1000" ${link.bandwidth === 1000 ? 'selected' : ''}>1000 Mbps (Gigabit)</option>
          </select>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn btn-secondary btn-full" id="insp-btn-cut">
            ${getIcon('cable-cut')} ${isUp ? 'Cut Cable' : 'Restore Cable'}
          </button>
          <button class="btn btn-danger btn-full" id="insp-btn-delete-link">
            ${getIcon('trash')} Delete
          </button>
        </div>
      </div>
    `;

    document.getElementById('insp-link-cost')?.addEventListener('change', (e) => {
      updateLinkProperties(link.id, { cost: e.target.value });
    });

    document.getElementById('insp-link-bw')?.addEventListener('change', (e) => {
      updateLinkProperties(link.id, { bandwidth: e.target.value });
    });

    document.getElementById('insp-btn-cut')?.addEventListener('click', () => {
      toggleCableStatus(link.id);
    });

    document.getElementById('insp-btn-delete-link')?.addEventListener('click', () => {
      deleteLink(link.id);
    });

  } else {
    renderNetworkSummary(container, state);
  }
}

/**
 * Text-based network summary when nothing is selected.
 */
function renderNetworkSummary(container, state) {
  const pcCount = state.nodes.filter(n => n.type === 'pc').length;
  const routerCount = state.nodes.filter(n => n.type === 'router').length;
  const serverCount = state.nodes.filter(n => n.type === 'server').length;
  const onlineCount = state.nodes.filter(n => n.status !== 'disabled').length;
  const downLinksCount = state.links.filter(l => l.status === 'down').length;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${getIcon('info')} Network Summary</span>
        <span class="chip ${state.sim.health === 'healthy' ? 'chip-success' : 'chip-warning'}">${state.sim.health.toUpperCase()}</span>
      </div>
      <p style="font-size: var(--fs-xs); color: var(--text-muted); margin-bottom: 12px;">
        Click any device or cable on the canvas to inspect its settings, adjust weights, or simulate cable cuts.
      </p>

      <div style="display: flex; flex-direction: column; gap: 8px; font-size: var(--fs-sm);">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-secondary);">Total Devices:</span>
          <strong>${state.nodes.length}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding-left: 8px; font-size: var(--fs-xs); color: var(--text-muted);">
          <span>Computers:</span> <span>${pcCount}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-left: 8px; font-size: var(--fs-xs); color: var(--text-muted);">
          <span>Routers:</span> <span>${routerCount}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-left: 8px; font-size: var(--fs-xs); color: var(--text-muted);">
          <span>Servers:</span> <span>${serverCount}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-secondary);">Online Devices:</span>
          <strong style="color: var(--success);">${onlineCount} / ${state.nodes.length}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-secondary);">Total Cables:</span>
          <strong>${state.links.length}</strong>
        </div>
        ${downLinksCount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: var(--danger);">
            <span>Cut Cables:</span>
            <strong>${downLinksCount}</strong>
          </div>
        ` : ''}
      </div>

      <div style="margin-top: 16px;">
        <button class="btn btn-secondary btn-full btn-sm" id="btn-load-sample-insp">
          ${getIcon('reset')} Reload Example Network
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-load-sample-insp')?.addEventListener('click', loadSampleTopology);
}

/**
 * Routing tab event bindings: Send Packet, speed slider, route comparison.
 */
function bindRoutingEvents() {
  const sendBtn = document.getElementById('routing-send-btn');
  const srcSelect = document.getElementById('routing-src-select');
  const dstSelect = document.getElementById('routing-dst-select');
  const speedSlider = document.getElementById('routing-speed-slider');
  const compareCheck = document.getElementById('routing-compare-check');

  sendBtn?.addEventListener('click', () => {
    const state = getState();
    const srcId = srcSelect?.value;
    const dstId = dstSelect?.value;

    if (!srcId || !dstId) {
      showToast('Please select both a source device and a destination device.', 'warning');
      return;
    }

    if (srcId === dstId) {
      showToast('Source and destination cannot be the same device.', 'warning');
      return;
    }

    const route = findShortestPath(state.nodes, state.links, srcId, dstId);
    if (!route) {
      showToast('No working path exists between the selected devices.', 'danger');
      addLog('packets', `Route calculation failed: destination unreachable from ${getNode(srcId)?.label}.`);
      state.ui.lastComputedRoute = null;
      renderRouteResultCard(null);
      return;
    }

    // Save previous route if comparing
    state.ui.previousRoute = state.ui.lastComputedRoute;
    state.ui.lastComputedRoute = route;

    renderRouteResultCard(route);
    sendPacket(route.path, route.totalCost);
  });

  speedSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    const speed = val === 1 ? 'slow' : (val === 3 ? 'fast' : 'normal');
    updateUI({ speed });
  });

  compareCheck?.addEventListener('change', (e) => {
    updateUI({ compareRoutes: e.target.checked });
  });
}

/**
 * Updates Source and Destination select options.
 */
function updateRoutingDropdowns(state) {
  const srcSelect = document.getElementById('routing-src-select');
  const dstSelect = document.getElementById('routing-dst-select');
  if (!srcSelect || !dstSelect) return;

  const currentSrc = srcSelect.value;
  const currentDst = dstSelect.value;

  srcSelect.innerHTML = '<option value="">-- Choose Source --</option>';
  dstSelect.innerHTML = '<option value="">-- Choose Destination --</option>';

  const onlineNodes = state.nodes.filter(n => n.status !== 'disabled');

  for (const n of onlineNodes) {
    const optSrc = document.createElement('option');
    optSrc.value = n.id;
    optSrc.textContent = `${n.label} (${n.ip})`;
    if (n.id === currentSrc) optSrc.selected = true;
    srcSelect.appendChild(optSrc);

    const optDst = document.createElement('option');
    optDst.value = n.id;
    optDst.textContent = `${n.label} (${n.ip})`;
    if (n.id === currentDst) optDst.selected = true;
    dstSelect.appendChild(optDst);
  }

  // Sensible defaults if unselected
  if (!srcSelect.value && onlineNodes.length > 0) {
    srcSelect.value = onlineNodes[0].id;
  }
  if (!dstSelect.value && onlineNodes.length > 1) {
    // Default destination to a server or last node
    const srv = onlineNodes.find(n => n.type === 'server');
    dstSelect.value = srv ? srv.id : onlineNodes[onlineNodes.length - 1].id;
  }
}

/**
 * Renders the shortest path result card and step-by-step breakdown.
 */
function renderRouteResultCard(route) {
  const card = document.getElementById('routing-result-card');
  if (!card) return;

  if (!route) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  const hopsHtml = route.path
    .map(id => `<span class="route-hop">${getNode(id)?.label || id}</span>`)
    .join('<span class="route-arrow"> → </span>');

  document.getElementById('route-hops-container').innerHTML = hopsHtml;
  document.getElementById('route-stat-hops').textContent = route.hops;
  document.getElementById('route-stat-cost').textContent = route.totalCost;

  document.getElementById('route-explanation-text').textContent =
    'Dijkstra picked this path because its total cost is the lowest.';

  // Step-by-step details
  const stepTableBody = document.getElementById('route-step-tbody');
  if (stepTableBody && route.stepDetails) {
    stepTableBody.innerHTML = route.stepDetails.map(step => `
      <tr>
        <td><strong>${getNode(step.node)?.label || step.node}</strong></td>
        <td>${step.distance === 0 ? '0 (Source)' : step.distance}</td>
        <td>${step.predecessor ? (getNode(step.predecessor)?.label || step.predecessor) : 'None'}</td>
      </tr>
    `).join('');
  }

  // Collapsible toggle
  const toggleBtn = document.getElementById('route-steps-toggle');
  const detailsContent = document.getElementById('route-steps-details');
  if (toggleBtn && detailsContent) {
    toggleBtn.onclick = () => {
      detailsContent.classList.toggle('expanded');
      toggleBtn.querySelector('span').textContent = detailsContent.classList.contains('expanded') ? 'Hide Details' : 'Show Details';
    };
  }
}

/**
 * Security Tab event bindings: Attack controls, Firewall toggles, Defense options.
 */
function bindSecurityEvents() {
  const attackBtn = document.getElementById('sec-start-attack-btn');
  const stopBtn = document.getElementById('sec-stop-attack-btn');
  const blockNowBtn = document.getElementById('sec-block-now-btn');
  const autoDefenseSwitch = document.getElementById('sec-auto-defense-switch');

  attackBtn?.addEventListener('click', () => {
    const srcSelect = document.getElementById('sec-attacker-select');
    const dstSelect = document.getElementById('sec-target-select');
    const typeRadio = document.querySelector('input[name="sec-attack-type"]:checked');
    const intensitySlider = document.getElementById('sec-intensity-slider');

    const intensityMap = { 1: 'low', 2: 'medium', 3: 'high' };
    const intensity = intensityMap[Number(intensitySlider?.value || 2)] || 'medium';

    startAttack({
      type: typeRadio?.value || 'flood',
      sourceId: srcSelect?.value,
      targetId: dstSelect?.value,
      intensity
    });
  });

  stopBtn?.addEventListener('click', () => {
    stopAttack();
    showToast('Attack stopped by user.', 'info');
  });

  blockNowBtn?.addEventListener('click', () => {
    const state = getState();
    const attackerId = state.sim.attack?.sourceId || document.getElementById('sec-attacker-select')?.value;
    if (attackerId) {
      applyFirewallBlock(attackerId, null, 'Manual admin mitigation block.');
    } else {
      showToast('Select an attacker device to block.', 'warning');
    }
  });

  autoDefenseSwitch?.addEventListener('change', (e) => {
    updateUI({ autoDefense: e.target.checked });
    showToast(`Automated defense ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
  });
}

/**
 * Updates Security Tab dynamic controls (attacker/target dropdowns, meter, alerts, firewall rules).
 */
function updateSecurityPanel(state) {
  const attackerSelect = document.getElementById('sec-attacker-select');
  const targetSelect = document.getElementById('sec-target-select');

  if (attackerSelect && attackerSelect.options.length <= 1) {
    attackerSelect.innerHTML = '';
    targetSelect.innerHTML = '';

    for (const n of state.nodes) {
      const opt = document.createElement('option');
      opt.value = n.id;
      opt.textContent = `${n.label} (${n.ip})`;
      attackerSelect.appendChild(opt);

      if (n.type === 'server') {
        const optDst = document.createElement('option');
        optDst.value = n.id;
        optDst.textContent = `${n.label} (${n.ip})`;
        targetSelect.appendChild(optDst);
      }
    }

    // Default: PC-3 attacker and Server-1 target if present
    const pc3 = state.nodes.find(n => n.label === 'PC-3');
    if (pc3) attackerSelect.value = pc3.id;

    const srv1 = state.nodes.find(n => n.label === 'Server-1');
    if (srv1) targetSelect.value = srv1.id;
  }

  // Attack status buttons
  const isAttacking = Boolean(state.sim.attack);
  const startBtn = document.getElementById('sec-start-attack-btn');
  const stopBtn = document.getElementById('sec-stop-attack-btn');
  if (startBtn) startBtn.disabled = isAttacking;
  if (stopBtn) stopBtn.disabled = !isAttacking;

  // Traffic meter
  const rpsVal = state.sim.trafficRps || 0;
  const meterValEl = document.getElementById('sec-meter-rps');
  const meterFillEl = document.getElementById('sec-meter-fill');
  if (meterValEl) meterValEl.textContent = `${rpsVal} req/s`;
  if (meterFillEl) {
    const pct = Math.min(100, (rpsVal / 280) * 100);
    meterFillEl.style.width = `${pct}%`;
    meterFillEl.className = `meter-bar-fill ${rpsVal > 100 ? 'danger' : (rpsVal > 50 ? 'warning' : '')}`;
  }

  // Scanned ports stats
  const scanBox = document.getElementById('sec-scan-stats');
  if (scanBox) {
    if (state.sim.attack && state.sim.attack.type === 'scan') {
      scanBox.style.display = 'block';
      document.getElementById('sec-scanned-count').textContent = state.sim.scannedPortsCount;
    } else {
      scanBox.style.display = 'none';
    }
  }

  // Render Alerts List
  renderAlertsList(state);

  // Render Firewall Rules
  renderFirewallRules(state);

  // Red dot on Security tab if unmitigated alert
  const hasUnmitigated = state.alerts.some(a => !a.mitigated);
  const dot = document.getElementById('security-tab-dot');
  if (dot) {
    if (hasUnmitigated) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  }
}

/**
 * Renders the alert cards in the Security tab.
 */
function renderAlertsList(state) {
  const container = document.getElementById('sec-alerts-list');
  if (!container) return;

  if (state.alerts.length === 0) {
    container.innerHTML = `
      <div style="font-size: var(--fs-xs); color: var(--text-muted); text-align: center; padding: 16px 0;">
        No security alerts detected. System is secure.
      </div>
    `;
    return;
  }

  container.innerHTML = state.alerts.map(a => `
    <div class="alert-card ${a.severity}">
      <div class="alert-header">
        <div class="alert-title-wrap">
          ${getIcon(a.severity === 'critical' ? 'alert-triangle' : 'info')}
          <span>${a.severity === 'critical' ? 'Critical · Flood Anomaly' : 'Warning · Reconnaissance'}</span>
        </div>
        <span class="alert-time">${formatTime(a.ts)}</span>
      </div>
      <div class="alert-body">${escapeHTML(a.message)}</div>
      <div class="alert-footer">
        <span class="chip ${a.mitigated ? 'chip-success' : 'chip-danger'}">
          ${a.mitigated ? (a.mitigationText || 'Protected: Attacker Blocked') : 'Not yet blocked'}
        </span>
        ${!a.mitigated ? `
          <button class="btn btn-secondary btn-sm" onclick="window.mitigateAlert('${a.id}')">
            ${getIcon('shield')} Block Attacker
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

window.mitigateAlert = function (alertId) {
  const state = getState();
  const alert = state.alerts.find(a => a.id === alertId);
  if (!alert) return;

  const attackerId = state.sim.attack?.sourceId || state.nodes.find(n => alert.message.includes(n.label))?.id;
  if (attackerId) {
    applyFirewallBlock(attackerId, alertId, 'Manual mitigation from alert card.');
  }
};

/**
 * Renders the Firewall Rules list in the Security tab.
 */
function renderFirewallRules(state) {
  const container = document.getElementById('sec-rules-list');
  if (!container) return;

  if (state.firewallRules.length === 0) {
    container.innerHTML = `
      <div style="font-size: var(--fs-xs); color: var(--text-muted); text-align: center; padding: 12px 0;">
        No active firewall rules.
      </div>
    `;
    return;
  }

  container.innerHTML = state.firewallRules.map(rule => `
    <div class="rule-item">
      <div class="rule-info">
        <span class="rule-title">${escapeHTML(rule.targetLabel)} (${rule.targetIp})</span>
        <span class="rule-meta">${rule.action} · ${rule.reason}</span>
      </div>
      <div class="rule-actions">
        <label class="switch">
          <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="window.toggleRule('${rule.id}')">
          <span class="switch-slider"></span>
        </label>
        <button class="btn btn-icon-sm" onclick="window.removeRule('${rule.id}')" title="Delete Rule">
          ${getIcon('trash')}
        </button>
      </div>
    </div>
  `).join('');
}

window.toggleRule = function (ruleId) {
  toggleFirewallRule(ruleId);
};

window.removeRule = function (ruleId) {
  removeFirewallRule(ruleId);
};

/**
 * Event Log tab bindings and rendering.
 */
function bindLogEvents() {
  document.getElementById('logs-clear-btn')?.addEventListener('click', () => {
    clearLogs();
    showToast('Event logs cleared.', 'info');
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentLogFilter = chip.getAttribute('data-filter') || 'all';
      updateLogsPanel(getState());
    });
  });
}

function updateLogsPanel(state) {
  const container = document.getElementById('logs-list-container');
  if (!container) return;

  const filtered = currentLogFilter === 'all'
    ? state.logs
    : state.logs.filter(l => l.category === currentLogFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="font-size: var(--fs-xs); color: var(--text-muted); text-align: center; padding: 20px 0;">
        No log entries recorded.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(log => `
    <div class="log-entry">
      <div class="log-entry-header">
        <span class="chip ${log.category === 'security' ? 'chip-danger' : (log.category === 'network' ? 'chip-info' : 'chip-warning')}">
          ${log.category.toUpperCase()}
        </span>
        <span class="log-time">${formatTime(log.ts)}</span>
      </div>
      <div class="log-message">${escapeHTML(log.message)}</div>
    </div>
  `).join('');
}

/**
 * Persistent alert banner under header.
 */
function updateAlertBanner(state) {
  const banner = document.getElementById('app-alert-banner');
  if (!banner) return;

  const unmitigated = state.alerts.find(a => !a.mitigated);
  if (unmitigated) {
    banner.classList.add('active');
    document.getElementById('alert-banner-text').textContent = unmitigated.message;
  } else {
    banner.classList.remove('active');
  }
}

/**
 * Status bar indicators: Network Health, Counts, Autosave.
 */
function updateStatusBar(state) {
  const healthEl = document.getElementById('statusbar-health');
  if (healthEl) {
    healthEl.className = `health-status ${state.sim.health}`;
    const labels = {
      healthy: 'Network healthy',
      degraded: 'Network degraded',
      'under-attack': 'Under attack!',
      protected: 'Protected'
    };
    healthEl.querySelector('.health-text').textContent = labels[state.sim.health] || 'Network healthy';
  }

  const nodesEl = document.getElementById('statusbar-nodes-count');
  if (nodesEl) nodesEl.textContent = state.nodes.length;

  const linksEl = document.getElementById('statusbar-links-count');
  if (linksEl) linksEl.textContent = state.links.length;

  const onlineEl = document.getElementById('statusbar-online-count');
  if (onlineEl) {
    const online = state.nodes.filter(n => n.status !== 'disabled').length;
    onlineEl.textContent = online;
  }

  const deliveredEl = document.getElementById('statusbar-delivered-count');
  if (deliveredEl) {
    deliveredEl.textContent = state.sim.deliveredPacketsCount || 0;
  }
}

/**
 * Modal dialog event handlers.
 */
function bindModalEvents() {
  // Close buttons on all modals
  document.querySelectorAll('.modal-close-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal) modal.classList.remove('open');
    });
  });

  // Welcome modal triggers
  document.getElementById('welcome-tour-btn')?.addEventListener('click', startTutorial);
  document.getElementById('welcome-skip-btn')?.addEventListener('click', closeWelcomeModal);

  // Save Modal Confirm
  document.getElementById('save-modal-confirm')?.addEventListener('click', () => {
    const input = document.getElementById('save-slot-name');
    const slotName = input?.value.trim() || 'My Topology';
    saveTopologyToSlot(slotName);
    document.getElementById('save-modal')?.classList.remove('open');
  });

  // Esc key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });
}

function renderSavedTopologiesList() {
  const container = document.getElementById('load-slots-list');
  if (!container) return;

  const topologies = getSavedTopologies();
  const keys = Object.keys(topologies);

  if (keys.length === 0) {
    container.innerHTML = `
      <div style="font-size: var(--fs-xs); color: var(--text-muted); text-align: center; padding: 20px 0;">
        No saved topologies found in your browser storage.
      </div>
    `;
    return;
  }

  container.innerHTML = keys.map(key => {
    const item = topologies[key];
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 8px;">
        <div>
          <div style="font-weight: 600; color: var(--text-primary);">${escapeHTML(item.name)}</div>
          <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
            ${item.nodeCount} devices · ${item.linkCount} cables · Saved: ${new Date(item.savedAt).toLocaleDateString()}
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm" onclick="window.loadSlot('${key}')">Load</button>
          <button class="btn btn-secondary btn-sm" onclick="window.deleteSlot('${key}')">${getIcon('trash')}</button>
        </div>
      </div>
    `;
  }).join('');
}

window.loadSlot = function (slotName) {
  loadTopologyFromSlot(slotName);
  fitToScreen();
  document.getElementById('load-modal')?.classList.remove('open');
};

window.deleteSlot = function (slotName) {
  deleteTopologySlot(slotName);
  renderSavedTopologiesList();
};


window.loadSampleTopology = loadSampleTopology;
window.fitToScreen = fitToScreen;
window.renderCanvas = renderCanvas;
window.setTopology = setTopology;
window.dismissCoverPage = hideCoverPage;
window.showCoverPage = showCoverPage;
window.sendPacket = sendPacket;
window.startAttack = startAttack;
window.stopAttack = stopAttack;

})();
