/**
 * @fileoverview NetShield Sim - API Adapter Layer
 * Exposes async functions mirroring future Flask REST API endpoints.
 * Currently backed by local in-browser simulation modules.
 * Set CONFIG.USE_BACKEND = true when connecting a live Flask server.
 */

import { getState, addLog } from './state.js';
import { findShortestPath } from './routing.js';
import { startAttack, applyFirewallBlock } from './security.js';
import { saveTopologyToSlot, loadTopologyFromSlot, getSavedTopologies } from './storage.js';

export const CONFIG = {
  USE_BACKEND: false,
  API_BASE_URL: 'http://localhost:5000/api'
};

/**
 * Saves a topology configuration.
 * Mirrors: POST /api/topologies
 * @param {object} topology 
 * @returns {Promise<{ success: boolean, id: string }>}
 */
export async function saveTopology(topology) {
  if (CONFIG.USE_BACKEND) {
    /* Example Flask fetch implementation:
    const response = await fetch(`${CONFIG.API_BASE_URL}/topologies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(topology)
    });
    return await response.json();
    */
  }

  const slotName = topology.name || `Topology-${Date.now()}`;
  const success = saveTopologyToSlot(slotName);
  return { success, id: slotName };
}

/**
 * Loads a topology configuration by ID.
 * Mirrors: GET /api/topologies/:id
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function loadTopology(id) {
  if (CONFIG.USE_BACKEND) {
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/topologies/${encodeURIComponent(id)}`);
    return await response.json();
    */
  }

  const topologies = getSavedTopologies();
  const entry = topologies[id];
  if (entry) {
    loadTopologyFromSlot(id);
    return entry.topology;
  }
  return null;
}

/**
 * Lists all saved topologies.
 * Mirrors: GET /api/topologies
 * @returns {Promise<Array<{ id: string, name: string, savedAt: string, nodeCount: number }>>}
 */
export async function listTopologies() {
  if (CONFIG.USE_BACKEND) {
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/topologies`);
    return await response.json();
    */
  }

  const topologies = getSavedTopologies();
  return Object.keys(topologies).map(key => ({
    id: key,
    name: topologies[key].name,
    savedAt: topologies[key].savedAt,
    nodeCount: topologies[key].nodeCount,
    linkCount: topologies[key].linkCount
  }));
}

/**
 * Computes shortest path between two nodes.
 * Mirrors: POST /api/route
 * @param {object} topology 
 * @param {string} sourceId 
 * @param {string} targetId 
 * @returns {Promise<{ path: string[], totalCost: number, hops: number }|null>}
 */
export async function computeRoute(topology, sourceId, targetId) {
  if (CONFIG.USE_BACKEND) {
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topology, source: sourceId, destination: targetId })
    });
    return await response.json();
    */
  }

  return findShortestPath(topology.nodes, topology.links, sourceId, targetId);
}

/**
 * Triggers a simulated network attack.
 * Mirrors: POST /api/attacks
 * @param {{ type: 'flood'|'scan', sourceNodeId: string, targetNodeId: string, intensity: string }} param0 
 * @returns {Promise<{ success: boolean }>}
 */
export async function triggerAttack({ type, sourceNodeId, targetNodeId, intensity = 'medium' }) {
  if (CONFIG.USE_BACKEND) {
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/attacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, sourceNodeId, targetNodeId, intensity })
    });
    return await response.json();
    */
  }

  const success = startAttack({
    type,
    sourceId: sourceNodeId,
    targetId: targetNodeId,
    intensity
  });
  return { success };
}

/**
 * Retrieves alerts.
 * Mirrors: GET /api/alerts
 * @returns {Promise<Array<object>>}
 */
export async function getAlerts() {
  if (CONFIG.USE_BACKEND) {
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/alerts`);
    return await response.json();
    */
  }

  const state = getState();
  return state.alerts;
}

/**
 * Applies a firewall defense rule.
 * Mirrors: POST /api/firewall
 * @param {object} rule 
 * @returns {Promise<{ success: boolean }>}
 */
export async function applyFirewallRule(rule) {
  if (CONFIG.USE_BACKEND) {
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/firewall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    return await response.json();
    */
  }

  applyFirewallBlock(rule.targetNodeId, rule.alertId, rule.reason);
  return { success: true };
}

/**
 * Appends a log entry to the backend log repository.
 * Mirrors: POST /api/logs
 * @param {{ category: string, message: string }} entry 
 * @returns {Promise<{ success: boolean }>}
 */
export async function appendLog(entry) {
  if (CONFIG.USE_BACKEND) {
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return await response.json();
    */
  }

  addLog(entry.category, entry.message);
  return { success: true };
}
