/**
 * @fileoverview NetShield Sim - Packet Animation Engine
 * Multi-packet transit simulation with requestAnimationFrame,
 * dynamic mid-flight re-routing, arrival rings, and failure pulses.
 * Matches DESIGN.md §6.5, §7 and Prompt specifications.
 */

import { getState, getNode, getLink, addLog, notify } from './state.js';
import { findShortestPath } from './routing.js';
import { showToast, distance, lerp, generateId } from './utils.js';

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
export function sendPacket(path, totalCost, options = {}) {
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
export function triggerArrivalEffect(x, y) {
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
export function triggerFailureEffect(x, y) {
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
export function clearAllPackets() {
  activePackets = [];
  const container = document.getElementById('packets-layer');
  if (container) container.innerHTML = '';
}
