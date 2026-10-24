/**
 * @fileoverview NetShield Sim - Security & Attack Simulation Engine
 * DoS Flood, Port Scan, Traffic Metering, Anomaly Detection, and Automated Firewall Defense.
 * Matches DESIGN.md §2.2, §6.6 and Prompt §5 specifications.
 */

import { getState, getNode, updateSim, addAlert, updateAlert, recomputeHealth, addLog, notify } from './state.js';
import { findShortestPath } from './routing.js';
import { sendPacket, clearAllPackets } from './packets.js';
import { showToast, generateId, formatTime } from './utils.js';

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
export function startAttack({ type = 'flood', sourceId, targetId, intensity = 'medium' }) {
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
export function stopAttack() {
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
export function applyFirewallBlock(targetNodeId, alertId = null, reason = 'Firewall block rule') {
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
export function toggleFirewallRule(ruleId) {
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
export function removeFirewallRule(ruleId) {
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
