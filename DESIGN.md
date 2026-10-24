# NetShield Sim: DESIGN.md

Design system for the NetShield Sim frontend (Computer Networks Lab project).
Stack: HTML5, CSS3, vanilla JavaScript, SVG/Canvas. No frameworks.

---

## 1. Design Principles

1. **Professional, not flashy.** A calm, cybersecurity-style console. No neon overload, no glitch effects, no gratuitous glow.
2. **Beginner first.** Every control has a plain-English label, a tooltip, and a visible result. Nobody should need to know networking jargon to use it.
3. **Show, don't just tell.** Every action produces visible feedback: packets move, links turn red when cut, alerts slide in.
4. **Color is never the only signal.** Every status uses color + icon + text (accessibility).
5. **Guided but not trapped.** A 5-minute tutorial helps new users, and experts can skip it.
6. **Simulation honesty.** A permanent "Simulation only. No real network is touched." badge is always visible.

---

## 2. Theme: "Midnight Teal on White"

One professional theme: a **clean white workspace** with **midnight navy** text and **teal** accents.
White keeps the tool readable on projectors and in printed reports. Midnight gives strong contrast. Teal marks everything interactive. There is no dark mode and no theme toggle, so the interface looks the same for every learner.

Brand roles:
- **White** (`#FFFFFF`): page, canvas, panels, header, modals.
- **Midnight** (`#08121A`): headings, body text, node icons, tooltips and the video/caption bars.
- **Teal** (`#0F766E` / `#14B8A6`): buttons, selection, active tab, active route, packets.
- **Green / Amber / Red**: always reserved for healthy / warning / attack, never used decoratively.

### 2.1 Color Tokens

```css
:root {
  /* Surfaces: all white */
  --bg-app:        #FFFFFF;  /* page background */
  --bg-panel:      #FFFFFF;  /* header, toolbar, right panel */
  --bg-canvas:     #FFFFFF;  /* topology workspace */
  --bg-subtle:     #F3F9F9;  /* cards, status bar, input fills */
  --bg-elevated:   #FFFFFF;  /* modals, dropdowns, toasts */
  --border:        #D5E3E5;
  --grid-line:     #EAF2F3;

  /* Midnight text */
  --midnight:      #08121A;  /* brand dark: tooltips, caption bars */
  --text-primary:  #08121A;
  --text-secondary:#3F5663;  /* 7.6:1 on white */
  --text-muted:    #5F7480;  /* 4.9:1 on white */

  /* Teal accent */
  --accent:        #0F766E;  /* buttons, links, active tab (white text passes AA) */
  --accent-hover:  #0B5F58;
  --accent-bright: #14B8A6;  /* rings, active route, packets (non-text only) */
  --accent-soft:   rgba(20,184,166,.14);

  /* Status colors (text-safe on white) */
  --success:       #15803D;  /* link up, delivered, protected */
  --success-bright:#22C55E;  /* dots, pulses (non-text only) */
  --warning:       #B45309;  /* warning alerts, port scan */
  --danger:        #DC2626;  /* link down, flood, blocked */
  --info:          #0E7490;  /* routers, hints */

  --packet:        #14B8A6;
  --path-highlight:#14B8A6;
  --attack-pulse:  #DC2626;
  --cable:         #9DB4BA;
}
```

Contrast requirement: all text must meet **WCAG AA (4.5:1)** against white. Bright teal (`#14B8A6`) and bright green are **never** used for text.

### 2.2 Semantic Status Mapping

| State | Color | Icon | Label text |
|---|---|---|---|
| Link up / healthy | `--success` | check circle | "Connected" |
| Link down | `--danger` | broken link | "Cable cut" |
| Node active | `--success` | dot | "Online" |
| Node disabled | `--text-muted` | power off | "Switched off" |
| Packet in transit | `--info` | arrow | "Travelling" |
| Packet delivered | `--success` | check | "Delivered" |
| Packet failed | `--danger` | x | "No path available" |
| Warning alert | `--warning` | triangle | "Warning" |
| Critical alert | `--danger` | shield alert | "Critical" |
| Mitigated | `--success` | shield check | "Protected" |

---

## 3. Typography

| Role | Font | Fallback |
|---|---|---|
| UI text | **Inter** | system-ui, -apple-system, Segoe UI, Roboto, sans-serif |
| Technical values (IPs, logs, paths) | **JetBrains Mono** | ui-monospace, Consolas, monospace |

Load via Google Fonts (`display=swap`).

| Token | Size / Line height | Weight | Use |
|---|---|---|---|
| `--fs-xs` | 12px / 16px | 500 | Badges, captions |
| `--fs-sm` | 13px / 18px | 400 | Secondary text, tooltips |
| `--fs-base` | 14px / 20px | 400 | Default UI text |
| `--fs-md` | 16px / 24px | 500 | Panel titles, buttons |
| `--fs-lg` | 20px / 28px | 600 | Section headings, modal titles |
| `--fs-xl` | 28px / 36px | 700 | Welcome screen heading |

Minimum text size anywhere: **12px**.

---

## 4. Spacing, Radius, Elevation

- **Spacing scale (4px base):** 4, 8, 12, 16, 24, 32, 48.
- **Radius:** `--r-sm: 6px` (inputs, badges), `--r-md: 10px` (buttons, cards), `--r-lg: 14px` (modals, panels).
- **Shadows:** `0 4px 16px rgba(8,18,26,.10)`. Keep them subtle on the white surface.
- **Borders:** 1px solid `--border`. Prefer borders over heavy shadows.
- **Transitions:** 150ms ease for hover/focus, 250ms for panel/modal. Respect `prefers-reduced-motion`.

---

## 5. Layout

### 5.1 Desktop (≥1366×768), the primary target

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: logo · project name · Save/Load · Help ·             │
│         [Simulation only] badge                              │
├────────┬─────────────────────────────────────┬───────────────┤
│ LEFT   │          TOPOLOGY CANVAS            │ RIGHT PANEL   │
│ TOOLBAR│   (grid background, nodes, cables,  │ Tabs:         │
│ 72px   │    animated packets)                │  Inspector    │
│        │                                     │  Routing      │
│        │                                     │  Security     │
│        │                                     │  Event Log    │
│        │                                     │ 320px         │
├────────┴─────────────────────────────────────┴───────────────┤
│ STATUS BAR: network health · nodes · links · autosave time   │
└──────────────────────────────────────────────────────────────┘
```

- Header height: 56px. Status bar: 32px.
- Canvas fills all remaining space.
- Alert toasts appear **top-center of the canvas**, and a persistent alert banner appears under the header during an active attack.

### 5.2 Tablet (≥1024×768)

- Left toolbar stays (64px).
- Right panel becomes a **collapsible drawer** (slides over the canvas, toggled by a header button).
- Status bar condensed to icons plus numbers.

### 5.3 Below 1024px

Show a friendly message: "NetShield Sim works best on a tablet or desktop screen (1024px or wider)."

---

## 6. Components

### 6.1 Buttons
- **Primary:** `--accent` fill, white text, 36px tall, radius `--r-md`.
- **Secondary:** transparent, 1px `--border`, `--text-primary`.
- **Danger:** `--danger` fill (for "Start Attack", "Delete").
- **Icon button:** 40×40, centered inline SVG icon, mandatory tooltip.
- States: hover (darker), focus (2px `--accent` outline, 2px offset), disabled (50% opacity, `not-allowed`), active (pressed, 1px down).

### 6.2 Tooltips (required on every toolbar and node-management control)
- Appear after 400ms hover **and** on keyboard focus.
- Max width 220px, `--midnight` background, white text, `--fs-sm`.
- Two lines max: **bold title** + one plain-English sentence. Example: **Link Tool**: "Click two devices to connect them with a cable."

### 6.3 Node Visuals (SVG icons, 48×48 with a label beneath)

| Type | Icon | Accent ring |
|---|---|---|
| Computer | monitor | `--accent` (teal) |
| Router | router with antennae | `--info` (deep cyan) |
| Server | stacked rack | `--warning` (amber) |

- Selected: 2px `--accent-bright` ring plus soft teal glow. All nodes sit on a white rounded tile (88px) with a soft shadow.
- Disabled: 40% opacity, dashed outline, small power-off badge.
- Under attack: pulsing red ring (`--attack-pulse`, 1.2s loop).
- Blocked: red "shield-x" badge.
- Label: node name (e.g. "PC-1") above, IP in monospace `--fs-xs` below.

### 6.4 Cables (links)
- 3px line in `--cable` by default, with a small white pill at the midpoint showing the cost.
- Up: `--cable`. Down: `--danger`, dashed, with a small ✕ at the midpoint.
- On the active route: `--path-highlight`, 3px, animated dash flow.
- Hover: show a pill with "Cost: 4 · Bandwidth: 100 Mbps · Up".

### 6.5 Packet
- 12px teal circle (`--packet`) with a white outline and a soft trailing fade of 5 smaller dots.
- Moves node to node with `requestAnimationFrame`, ~600ms per hop (adjustable by the speed slider).
- On arrival: green ring pulse. On failure: red flash at the last reachable node.

### 6.6 Alert Cards
- Left color bar (warning or critical), icon, title, **plain-English message**, timestamp, and a mitigation status chip.
- Example: **Critical · Too much traffic**: "PC-3 is sending a huge amount of data to Server-1. This looks like a flood attack. Status: Not yet blocked."
- After mitigation, the chip changes to "Protected: PC-3 was blocked."

### 6.7 Forms and Inputs
- Height 36px, 1px `--border`, radius `--r-sm`, focus ring `--accent`.
- Labels above inputs, helper text below in `--text-muted`.
- Inline validation errors in `--danger` with an icon, in plain English ("Please enter a name between 1 and 20 characters.").

### 6.8 Tabs (right panel)
- Underline style, active tab in `--accent`.
- The Security tab shows a red dot when an unresolved alert exists.

### 6.9 Modals
- Centered, max-width 520px, backdrop `rgba(8,18,26,.45)`, closes on Esc, focus trapped.
- Used for: Welcome/Tutorial, Save, Load, Confirm Delete.

### 6.10 Toasts
- Bottom-right of the canvas, 4s auto-dismiss, `role="status"`. Errors use `role="alert"`.

### 6.11 Tutorial Overlay
- Spotlight cut-out around the highlighted control plus a coach-mark card with **Step X of 6**, Back, Next and Skip.
- Whole tutorial fits within 5 minutes. Can be reopened from the Help button.

---

## 7. Motion Rules

- Packet and path animations target **≥30 FPS** with up to 50 nodes (use `transform`, batch DOM updates, avoid layout thrash).
- Drag response under **100 ms**.
- Attack pulse: 1.2s ease-in-out infinite.
- Alert toast: 250ms slide + fade.
- With `prefers-reduced-motion: reduce`, replace the pulse and flow animations with static highlights.

---

## 8. Iconography

Inline SVG, 24px grid, 1.75px stroke, rounded caps, `currentColor`. A single sprite or a small `icons.js` module. No icon fonts, no emojis in the UI.

Required icons: monitor, router, server, link, cable-cut, play, pause, reset, send, shield, shield-check, shield-x, alert-triangle, flood, scan, save, load, help, trash, power, zoom-in, zoom-out, fit, check, x, info, clock.

---

## 9. Content and Tone

- Plain English. Short sentences. Active voice.
- Define jargon on first use with a tooltip (e.g. "Dijkstra's algorithm: a method that finds the cheapest path between two devices").
- Never blame the user. Errors explain what happened and what to do next.
- Empty states always say what to do: "Your canvas is empty. Drag a Computer, Router or Server from the left to start."

| Instead of | Write |
|---|---|
| "DoS volumetric anomaly detected" | "Too much traffic is hitting Server-1. This looks like a flood attack." |
| "Port scan from 10.0.0.4" | "PC-3 is checking many doors (ports) on Server-1, which may be a snooping attempt." |
| "ICMP unreachable" | "The packet could not reach its destination. There is no working path." |
| "Rule applied: DROP" | "PC-3 has been blocked by the firewall." |

---

## 10. Accessibility

- Full keyboard operation: Tab order follows header → toolbar → canvas → panel → status bar. Arrow keys nudge a selected node by 10px. Delete removes the selection. Esc cancels the active tool.
- Visible focus rings everywhere.
- ARIA: toolbar `role="toolbar"`, tabs `role="tablist"`, live region for alerts (`aria-live="polite"`, critical = `assertive`).
- Canvas SVG has `<title>` and `<desc>`. A text-based "Network summary" in the Inspector lists nodes and links for screen readers.
- Touch targets ≥ 40×40px on tablet.

---

## 11. Security in the UI

- **Never** insert user text with `innerHTML`. Use `textContent` or `createElement`.
- Validate names (1–20 chars, letters/numbers/space/dash/underscore), IPs (IPv4 pattern), numbers (min/max).
- Validate loaded JSON against a schema before using it, and reject on mismatch with a friendly message.
- Footer note in the Security tab: "Simulation only. No real network is attacked."

---

## 12. File and Folder Structure

```
netshield-sim/
├── index.html
├── css/
│   ├── tokens.css        (variables from §2, §3, §4)
│   ├── base.css          (reset, typography, layout shell)
│   ├── components.css    (buttons, tabs, modals, alerts, tooltips)
│   └── canvas.css        (nodes, links, packet, animations)
├── js/
│   ├── main.js           (bootstrap, event wiring)
│   ├── state.js          (single source of truth + pub/sub)
│   ├── topology.js       (add/move/delete nodes & links)
│   ├── canvas.js         (SVG rendering, drag, zoom/pan)
│   ├── routing.js        (Dijkstra, min-heap)
│   ├── packets.js        (animation engine)
│   ├── faults.js         (disable/restore, reroute)
│   ├── security.js       (flood, port scan, detection, firewall)
│   ├── api.js            (adapter: local mock now, Flask later)
│   ├── storage.js        (localStorage, JSON validation, autosave)
│   ├── tutorial.js       (guided tour)
│   ├── tooltips.js
│   ├── icons.js
│   └── utils.js          (sanitize, validate, ids, throttle)
├── data/
│   └── sample-topology.json
└── assets/
```

---

## 13. Definition of Done (Design)

- [ ] The Midnight Teal theme passes AA contrast (no bright teal or bright green used for text).
- [ ] Every interactive control has a tooltip and focus style.
- [ ] No horizontal scroll at 1366×768 or 1024×768.
- [ ] Drag < 100 ms, animation ≥ 30 FPS at 50 nodes.
- [ ] A first-time user completes the tutorial in ≤ 5 minutes.
- [ ] All alert and error text reviewed for plain English.
- [ ] Works in latest Chrome, Firefox, Edge, Safari.
