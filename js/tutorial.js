/**
 * @fileoverview NetShield Sim - 5-Minute Guided Tutorial
 * 6-step interactive walkthrough with spotlight cutouts and coachmarks.
 * Matches DESIGN.md §6.11 and Prompt specifications.
 */

import { updateUI } from './state.js';

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
export function initTutorial() {
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
export function showWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.classList.add('open');
  }
}

/**
 * Closes the Welcome Modal.
 */
export function closeWelcomeModal() {
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
export function startTutorial() {
  closeWelcomeModal();
  currentStepIndex = 0;
  if (!overlayEl) createTutorialDOM();
  overlayEl.classList.add('active');
  renderStep(currentStepIndex);
}

/**
 * Ends the tutorial.
 */
export function endTutorial() {
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
