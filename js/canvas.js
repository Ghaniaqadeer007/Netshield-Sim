/**
 * @fileoverview NetShield Sim - SVG Canvas Interaction Engine
 * Zoom, Pan, Drag-and-Drop, Cable Creation, Context Menus, and SVG rendering.
 * Matches DESIGN.md §5, §6.3, §6.4 and Prompt specifications.
 */

import { getState, getNode, getLink, updateUI, notify, pushHistory } from './state.js';
import { addNode, moveNode, addLink, deleteNode, deleteLink } from './topology.js';
import { toggleCableStatus, toggleNodePower } from './faults.js';
import { ICONS, getIcon } from './icons.js';
import { clamp, showToast } from './utils.js';

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
export function initCanvas() {
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
export function renderCanvas() {
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
export function screenToWorld(clientX, clientY) {
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
export function zoomCanvas(delta) {
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
export function fitToScreen() {
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
