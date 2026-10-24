/**
 * @fileoverview NetShield Sim - Storage & Persistence Engine
 * LocalStorage slots, JSON import/export, schema validation, and autosave.
 * Matches DESIGN.md §6 and Prompt specifications.
 */

import { getState, setTopology, addLog, notify } from './state.js';
import { validateIPv4, formatTime, showToast } from './utils.js';

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
export function validateTopologyJSON(data) {
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
export function saveTopologyToSlot(slotName) {
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
export function getSavedTopologies() {
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
export function loadTopologyFromSlot(slotName) {
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
export function deleteTopologySlot(slotName) {
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
export function exportTopologyFile() {
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
export function importTopologyFile(file) {
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
export function performAutosave() {
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
export function getAutosavedSession() {
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
export function restoreAutosavedSession() {
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
export function initAutosave() {
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
