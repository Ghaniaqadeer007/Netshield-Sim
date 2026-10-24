/**
 * @fileoverview NetShield Sim - Main Application Controller
 * UI Event wiring, tab coordination, Inspector/Routing/Security rendering, and bootstrap.
 * Matches DESIGN.md specifications.
 */

import {
  getState,
  subscribe,
  updateUI,
  updateSim,
  setTopology,
  clearTopology,
  getNode,
  getLink,
  getLinksForNode,
  recomputeHealth,
  clearLogs,
  undo,
  redo,
  canUndo,
  canRedo,
  addLog,
  updateAlert
} from './state.js';

import { initCanvas, renderCanvas, zoomCanvas, fitToScreen } from './canvas.js';
import { findShortestPath } from './routing.js';
import { sendPacket } from './packets.js';
import { toggleCableStatus, toggleNodePower } from './faults.js';
import { startAttack, stopAttack, applyFirewallBlock, toggleFirewallRule, removeFirewallRule } from './security.js';
import {
  initAutosave,
  saveTopologyToSlot,
  loadTopologyFromSlot,
  getSavedTopologies,
  deleteTopologySlot,
  exportTopologyFile,
  importTopologyFile,
  getAutosavedSession,
  restoreAutosavedSession
} from './storage.js';
import { initTooltips } from './tooltips.js';
import { initTutorial, startTutorial, closeWelcomeModal } from './tutorial.js';
import { updateNodeProperties, updateLinkProperties, deleteNode, deleteLink } from './topology.js';
import { getIcon } from './icons.js';
import { showToast, formatTime, escapeHTML } from './utils.js';
import { initCoverPage } from './cover.js';
import { DEFAULT_TOPOLOGY } from './default-topology.js';

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
export async function loadSampleTopology() {
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
