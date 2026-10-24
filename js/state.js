/**
 * @fileoverview NetShield Sim - State Management
 * Single source of truth with pub/sub architecture and undo/redo history.
 * Matches specifications in DESIGN.md and Prompt.
 */

import { generateId } from './utils.js';

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
export function getState() {
  return state;
}

/**
 * Subscribes a listener function to state changes.
 * @param {(state: typeof initialState, event?: { type: string, payload: any }) => void} listener 
 * @returns {() => void} Unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notifies all subscribers of a state change.
 * @param {string} [type='STATE_CHANGED'] 
 * @param {any} [payload] 
 */
export function notify(type = 'STATE_CHANGED', payload = null) {
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
export function pushHistory() {
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
export function undo() {
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
export function redo() {
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

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}

/**
 * Updates partial UI state.
 * @param {Partial<typeof initialState.ui>} updates 
 */
export function updateUI(updates) {
  state.ui = { ...state.ui, ...updates };
  notify('UI_CHANGED', updates);
}

/**
 * Updates partial simulation state.
 * @param {Partial<typeof initialState.sim>} updates 
 */
export function updateSim(updates) {
  state.sim = { ...state.sim, ...updates };
  notify('SIM_CHANGED', updates);
}

/**
 * Replaces the entire topology with new nodes, links, and optional name.
 * @param {{ nodes: any[], links: any[], name?: string, firewallRules?: any[] }} topology 
 */
export function setTopology(topology) {
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
export function clearTopology() {
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
export function addLog(category, message) {
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
export function clearLogs() {
  state.logs = [];
  notify('LOGS_CLEARED');
}

/**
 * Adds a security alert.
 * @param {{ type: string, severity: 'warning'|'critical', nodeId?: string, message: string }} alert 
 * @returns {string} Alert ID
 */
export function addAlert(alert) {
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
export function updateAlert(alertId, updates) {
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
export function recomputeHealth() {
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
export function getNode(id) {
  return state.nodes.find(n => n.id === id);
}

/**
 * Link helper: find link by id
 * @param {string} id 
 */
export function getLink(id) {
  return state.links.find(l => l.id === id);
}

/**
 * Returns all links connected to a specific node id.
 * @param {string} nodeId 
 */
export function getLinksForNode(nodeId) {
  return state.links.filter(l => l.source === nodeId || l.target === nodeId);
}
