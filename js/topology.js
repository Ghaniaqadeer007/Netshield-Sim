/**
 * @fileoverview NetShield Sim - Topology Builder Module
 * Device creation, cable management, grid snapping, deletion, and auto-naming.
 * Matches DESIGN.md §6.3, §6.4 and Prompt §1 specifications.
 */

import { getState, getNode, getLink, getLinksForNode, updateUI, recomputeHealth, addLog, notify, pushHistory } from './state.js';
import { generateId, snapToGrid, showToast, validateIPv4, validateName } from './utils.js';

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
export function generateNodeIdentity(type) {
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
export function addNode(type, rawX, rawY) {
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
export function moveNode(nodeId, rawX, rawY) {
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
export function addLink(sourceId, targetId, cost = 2, bandwidth = 100) {
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
export function deleteNode(nodeId) {
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
export function deleteLink(linkId) {
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
export function updateNodeProperties(nodeId, updates) {
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
export function updateLinkProperties(linkId, updates) {
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
