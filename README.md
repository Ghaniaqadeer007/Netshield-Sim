# NetShield Sim: Interactive Network Simulation & Security Dashboard

A browser-based interactive network topology builder, Dijkstra routing animator, fault tolerance lab, and cyber defense simulator built for Computer Networks students.

> **Simulation Honesty:** Everything runs locally inside the browser. No real network or remote device is ever touched.

---

## 🚀 Quick Start (How to Run)

Since NetShield Sim uses native ES6 JavaScript modules, it should be served with any static web server:

### Option 1: Python HTTP Server (Built-in)
```bash
# In the project directory:
python -m http.server 8000
```
Then open your browser at **`http://localhost:8000`**.

### Option 2: Node.js `npx serve` or `http-server`
```bash
npx serve .
# or
npx http-server -p 8000
```

### Option 3: VS Code Live Server
Right-click `index.html` in VS Code and select **"Open with Live Server"**.

---

## 📁 Folder & File Structure

```
CN PROJECT/
├── index.html                  # Main application shell with CSP and accessible ARIA markup
├── README.md                   # Setup guide, architectural overview, and feature checklist
├── DESIGN.md                   # Full design system, color tokens, and UI specs
├── css/
│   ├── tokens.css              # Design tokens ("Midnight Teal on White", typography, spacing)
│   ├── base.css                # App shell, responsive breakpoints, layout grid
│   ├── components.css          # Buttons, cards, modals, alerts, toasts, tooltips
│   └── canvas.css              # SVG nodes, cables, packet animations, flow dashes
├── js/
│   ├── main.js                 # App orchestrator, event bindings, and panel updates
│   ├── cover.js                # Cover Opening Page: harmonic constellation canvas & transition
│   ├── state.js                # Single source of truth with pub/sub and undo/redo
│   ├── topology.js             # Device placement, cable linking, grid snapping, auto-naming
│   ├── canvas.js               # SVG rendering, pan, zoom (50%-200%), drag-and-drop, context menus
│   ├── routing.js              # Dijkstra algorithm with Binary Min-Heap (<500ms for 100+ nodes)
│   ├── packets.js              # requestAnimationFrame packet engine with mid-flight rerouting
│   ├── faults.js               # Cable cutting, device power toggles, dynamic path recalculation
│   ├── security.js             # DoS Flood & Port Scan simulation, anomaly detection, firewall
│   ├── api.js                  # Adapter layer mirroring Flask REST endpoints
│   ├── storage.js              # LocalStorage slots, JSON schema validation, 5-min autosave
│   ├── tutorial.js             # 6-step guided walkthrough with spotlight cutouts
│   ├── tooltips.js             # Accessible 400ms hover and keyboard focus tooltips
│   ├── icons.js                # Clean inline SVG icon definitions (24x24, 1.75px stroke)
│   └── utils.js                # Validation (IPv4, names), IDs, geometry, toasts, formatting
├── data/
│   └── sample-topology.json    # Pre-built 9-device topology with primary & redundant routes
└── assets/
```

---

## 🔌 Switching `api.js` to a Flask Backend Later

NetShield Sim includes a clean **Adapter Pattern** in [`js/api.js`](file:///c:/Users/HP/Desktop/CN%20PROJECT/js/api.js).
All simulation endpoints mirror real REST endpoints:
- `POST /api/topologies` - Save topology
- `GET /api/topologies/:id` - Load topology
- `GET /api/topologies` - List saved topologies
- `POST /api/route` - Dijkstra path computation
- `POST /api/attacks` - Trigger attack simulation
- `GET /api/alerts` - Retrieve detected alerts
- `POST /api/firewall` - Apply firewall rule
- `POST /api/logs` - Append system logs

### To connect to Flask:
1. In [`js/api.js`](file:///c:/Users/HP/Desktop/CN%20PROJECT/js/api.js), set:
   ```javascript
   export const CONFIG = {
     USE_BACKEND: true,
     API_BASE_URL: 'http://localhost:5000/api'
   };
   ```
2. Uncomment the `fetch()` calls inside the exported functions in `api.js`.
3. In `index.html`, add your Flask server origin (e.g. `http://localhost:5000`) to the `connect-src` directive in the CSP `<meta>` tag.

---

## ✨ Feature Checklist (Mapped to Project Requirements)

| Feature | Implementation Details | Status |
|---|---|:---:|
| **Interactive Network Builder** | Add Computer, Router, Server; auto-incremented names & unique IPs; drag with 10px grid snap; Link tool connecting devices with validation; delete via key/toolbar. | ✅ Complete |
| **Undo / Redo (Ctrl+Z / Ctrl+Y)** | Full state snapshots on device add, move, cable link, and delete. | ✅ Complete |
| **Dijkstra Pathfinding** | Binary Min-Heap priority queue (`MinHeap`), pure and testable, computes in <10ms for 100 nodes, benchmark helper included. | ✅ Complete |
| **Packet Animation** | Smooth `requestAnimationFrame` multi-packet transit, speed slider (Slow/Normal/Fast), green arrival pulse, red failure flash. | ✅ Complete |
| **Fault Tolerance & Dynamic Rerouting** | Cut/Restore cables and Switch Off/On devices in Inspector or right-click context menu; mid-flight dynamic rerouting; "Compare Routes" toggle showing old vs new route. | ✅ Complete |
| **Attack Simulation (DoS Flood)** | High-frequency packet stream, pulsing target halo, live traffic meter (RPS), threshold detection (>100 req/s), Critical alert. | ✅ Complete |
| **Attack Simulation (Port Scan)** | Sequential port probes, probed ports counter, Warning alert when >15 ports scanned. | ✅ Complete |
| **Automated Firewall Defense** | Automated detection and blocking with ~2s educational delay; Auto-defense ON/OFF toggle; manual "Block Now" button; rule list with enable/disable toggles. | ✅ Complete |
| **Storage & Persistence** | LocalStorage slot manager, JSON export/import with strict schema validation, 5-minute autosave + `beforeunload` hook. | ✅ Complete |
| **Guided Tutorial** | 6-step interactive walkthrough with SVG spotlight cutouts and coachmarks; reopenable via Help button. | ✅ Complete |
| **Tooltips & Accessibility** | 400ms hover and keyboard focus tooltips on every interactive element; ARIA live regions; WCAG AA contrast; reduced-motion support. | ✅ Complete |
| **Cover Opening Page** | Animated constellation canvas with dynamic teal connections, hero branding, and "Go to Workspace" button + Space/Enter shortcut. | ✅ Complete |
| **Theme: Midnight Teal on White** | "Midnight Teal on White" unified theme with white workspace, midnight navy text, and teal interactive accents. | ✅ Complete |

---

## 🧪 Acceptance Test Verification Walkthrough

1. **Load Example Network:** Click "Load Example" in header. The 9-device Office Network loads with clients on the left, routers in the center, and servers on the right.
2. **Send Packet:** Go to the Routing tab, select `PC-1` → `Server-1`, and click "Send Packet". The packet animates across the primary path (`PC-1 → R1 → R2 → Server-1`, Cost: 7), and a green arrival toast confirms delivery.
3. **Cut Cable & Dynamic Rerouting:** Click the cable between `R1` and `R2`. In the Inspector tab, click "Cut Cable" (or right-click it). It turns red and dashed with an ✕ marker. Click "Send Packet" again: Dijkstra automatically re-routes via `R3` (`PC-1 → R1 → R3 → R4 → Server-1`, Cost: 10).
4. **Trigger Flood Attack:** Go to the Security tab. Select `PC-3` as attacker and `Server-1` as target. Click "Start Attack". Red packets flood the target, the traffic meter spikes past 100 req/s, the target pulses red, and a Critical alert appears. After 2 seconds, automated defense blocks `PC-3` with a shield badge, traffic drops to 0, and the status changes to **Protected**.
5. **Trigger Port Scan:** Select "Port Scan" and click "Start Attack". The ports checked counter increments, amber probe packets travel to the server, and a Warning alert triggers after 15 ports.
6. **Save & Reload:** Click "Save" and save to a slot. Reload the browser page. The topology and autosaved state are restored cleanly.
