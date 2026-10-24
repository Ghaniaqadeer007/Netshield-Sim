/**
 * @fileoverview NetShield Sim - Fault Tolerance Module
 * Cable cuts, device shutdown/restore, and dynamic reroute recalculation.
 * Matches DESIGN.md §4 specifications.
 */

import { getState, getNode, getLink, recomputeHealth, addLog, notify, pushHistory } from './state.js';
import { findShortestPath } from './routing.js';
import { showToast } from './utils.js';

/**
 * Toggles a cable's status between 'up' and 'down'.
 * @param {string} linkId 
 * @returns {boolean} New status ('up' or 'down')
 */
export function toggleCableStatus(linkId) {
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
export function toggleNodePower(nodeId) {
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
export function checkAndRerouteActivePath() {
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
