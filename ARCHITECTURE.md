# Live Flip Clock — Software Architecture Document

**Version:** 2.0
**Author:** Arisudan
**Status:** Architecture Blueprint

---

## 1. Overview

The Live Flip Clock is a single-page application that renders a real-time, themeable, animated flip clock in the browser. It uses zero external runtime dependencies — only Google Fonts for typography.

### Design Tenets

| Principle | Rationale |
|---|---|
| No framework lock-in | Vanilla JS for durability and zero dependency weight |
| CSS-driven animation | Flip mechanics via GPU-accelerated CSS 3D transforms |
| State outside DOM | Single source of truth in JS; DOM is a view projection |
| Accessible by default | ARIA, reduced-motion, keyboard, and contrast built into architecture |
| Performant at 60fps | DOM queries eliminated from hot path; forced reflow batched |

---

## 2. Folder Structure

```
flip-clock/
├── index.html              # Entry point — semantic shell
├── css/
│   ├── reset.css           # Minimal modern reset
│   ├── tokens.css          # Design tokens (spacing, timing, radii)
│   ├── themes.css          # Theme color variables (dark/light/sage/sakura)
│   ├── base.css            # Body, layout containers
│   ├── components.css      # Controls, toggle, theme buttons, flip-card, colon, ampm
│   ├── animations.css      # @keyframes + animation trigger classes
│   └── responsive.css      # All breakpoint overrides
├── js/
│   ├── app.js              # Bootstrap, imports, init
│   ├── FlipClock.js        # Main controller: wires subsystems, owns the tick loop
│   ├── FlipCardManager.js  # Manages 6 FlipCard instances, stagger, batch reflow
│   ├── FlipCard.js         # Single card: DOM refs, update logic, cleanup
│   ├── ThemeManager.js     # Theme state, apply, persist, meta updates
│   └── utils.js            # Scheduler, storage helpers, DOM helpers, constants
└── ARCHITECTURE.md         # This document
```

**Rationale for 6 JS modules:** Each module has exactly one responsibility. No module exceeds ~100 lines. The separation enables unit-testing each subsystem in isolation.

---

## 3. Component Hierarchy

```
App
└── FlipClock ─────────────────────────────────────────────
    ├── FlipCardManager                                     │
    │   ├── FlipCard (hours-tens)                           │
    │   ├── FlipCard (hours-unit)                           │
    │   ├── FlipCard (minutes-tens)                         │
    │   ├── FlipCard (minutes-unit)                         │
    │   ├── FlipCard (seconds-tens)                         │
    │   └── FlipCard (seconds-unit)                         │
    ├── ThemeManager                                        │
    │   └── Controls (toggle, theme-buttons)                │
    └── Scheduler (utils.js)                                │
                                                            │
    Data flow per tick:                                     │
    Scheduler → FlipClock._tick() → FlipCardManager         │
                                     → ThemeManager         │
                                     → ScreenReaderAnnouncer│
```

### Communication Diagram

```
┌─────────────┐  tick()   ┌──────────────────┐  batchUpdate()  ┌─────────────┐
│  Scheduler  │ ────────→ │  FlipClock       │ ───────────────→ │ FlipCard    │
│  (setTimeout│           │  (owns state)     │                 │ Manager     │
│   ± 1s)     │           │  _state = { ... } │                 │             │
└─────────────┘           └───────┬───────────┘                 └──────┬──────┘
                                  │ setTheme(name)                     │ update(id,val)
                                  ▼                                    ▼
                          ┌───────────────┐                   ┌──────────────┐
                          │ ThemeManager   │                   │  FlipCard ×6 │
                          │ apply()        │                   │  animate()   │
                          │ persist()      │                   │  cleanup()   │
                          │ updateMeta()   │                   └──────────────┘
                          └───────────────┘
```

Every component communicates **unidirectionally** — `FlipClock` delegates down, never up. State changes flow:
- User action → DOM event → `FlipClock` handler → state mutation → delegated update
- Clock tick → `Scheduler` callback → `FlipClock._tick()` → read `Date.now()` → `FlipCardManager.batchUpdate()` → `FlipCard.animate()`

---

## 4. HTML Architecture

The HTML is a thin, semantic shell. No content is rendered server-side; the clock digits are placeholders until JS hydrates them.

### Structure

```
body.theme-dark
├── header.controls-panel
│   ├── .toggle-container
│   │   ├── span.toggle-label          "12-Hour Format"
│   │   └── label.switch
│   │       ├── input[type=checkbox]   role="switch"
│   │       └── span.switch__track
│   └── .theme-picker[role=radiogroup]
│       └── button.theme-btn ×4        role="radio"
├── main.clock-wrapper
│   └── section.clock-container[role=timer]
│       ├── .flip-group
│       │   ├── .flip-card ×2          #hours-tens, #hours-unit
│       │   │   ├── .flip-card__top-back > span
│       │   │   ├── .flip-card__bottom-back > span
│       │   │   ├── .flip-card__top-front > span
│       │   │   └── .flip-card__bottom-front > span
│       ├── .colon[aria-hidden]
│       ├── .flip-group (minutes)
│       │   └── .flip-card ×2
│       ├── .colon[aria-hidden]
│       ├── .flip-group (seconds)
│       │   └── .flip-card ×2
│       └── .ampm-card#ampm-indicator
└── .sr-only#clock-announcer           aria-live="polite"
```

### Key HTML Decisions

| Decision | Reason |
|---|---|
| `aria-hidden="true"` on `.flip-group` | Screen readers should not read raw digit elements every second |
| `.sr-only` announcer outside `<main>` | Separates visual DOM from accessibility tree updates |
| `role="switch"` on checkbox | Modern AT announces this as an on/off toggle, not a checkbox |
| `role="radiogroup"` on theme picker | Semantically correct single-select group |
| `id="theme-meta"` on `<meta theme-color>` | Allows JS to dynamically update browser chrome color |
| `<link rel="preconnect">` for fonts | Eliminates DNS + TCP round-trip latency for Google Fonts |
| `<script defer>` | Non-blocking; executes after HTML parse, before `DOMContentLoaded` |
| No `<template>` or shadow DOM | Keeps initial HTML render instant; hydration is transparent |

---

## 5. CSS Architecture

### File Roles

| File | Responsibility | Est. Lines |
|---|---|---|
| `reset.css` | Box-sizing, margin/padding reset, element defaults | 30 |
| `tokens.css` | `:root` variables for non-color tokens (sizes, timings, radii, z-layers) | 40 |
| `themes.css` | The `.theme-*` classes with color custom properties | 60 |
| `base.css` | Body, scroll container, `.sr-only` utility | 40 |
| `components.css` | All component styles (controls, flip-card, colon, ampm) | 200 |
| `animations.css` | `@keyframes`, animation trigger classes, hover, transitions | 100 |
| `responsive.css` | All `@media` breakpoint overrides | 60 |

**Total CSS:** ~530 lines (vs. 470 in current build — slight increase due to modularization).

### Token Categories (`tokens.css`)

```css
:root {
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 14px;
  --space-lg: 22px;
  --space-xl: 28px;

  /* Timing */
  --duration-flip-top: 0.18s;
  --duration-flip-bottom: 0.18s;
  --duration-theme: 0.35s;
  --duration-toggle: 0.3s;
  --duration-hover: 0.25s;

  /* Easing */
  --ease-flip-top: cubic-bezier(0.4, 0, 1, 1);
  --ease-flip-bottom: cubic-bezier(0, 0, 0.2, 1);
  --ease-theme: ease;
  --ease-toggle: ease;

  /* Radii */
  --radius-card: clamp(10px, 1.5vw, 16px);
  --radius-controls: 50px;
  --radius-ampm: 14px;

  /* Shadows */
  --shadow-card: 0 20px 45px var(--color-shadow);
  --shadow-card-hover: 0 24px 50px var(--color-shadow);
  --shadow-controls: 0 10px 30px rgba(0,0,0,0.12);
  --shadow-ampm: 0 10px 25px var(--color-shadow);

  /* Z-index layers */
  --z-divider: 5;
  --z-card-back: 1;
  --z-card-front: 2;
  --z-controls: 100;

  /* Perspective */
  --perspective-card: 600px;
}
```

### Theme Variable Contract (`themes.css`)

Each `.theme-*` class MUST define these variables:

| Variable | Purpose |
|---|---|
| `--color-bg` | Page background |
| `--color-text` | Primary text color |
| `--color-card-bg` | Flip card surface |
| `--color-accent` | Accent for interactive elements |
| `--color-border` | Subtle border color |
| `--color-shadow` | Box shadow tint (alpha included) |
| `--color-ring` | Focus/active ring |
| `--color-surface` | Control panel background (with alpha for glassmorphism) |
| `--color-hinge` | Divider line color |
| `--color-glow` | Optional accent glow for colons |

### Component Naming Convention

BEM-inspired with single underscore for elements, double dash for modifiers:

```
.block
.block__element
.block--modifier
```

Examples:
- `.flip-card` → block
- `.flip-card__top-front` → element
- `.flip-card--animate` → modifier

### Cascade Order

1. `reset.css` — universal defaults
2. `tokens.css` — `:root` design tokens
3. `themes.css` — theme color variables (lower specificity than tokens)
4. `base.css` — body, structure
5. `components.css` — all component styles
6. `animations.css` — keyframes, triggers, transitions
7. `responsive.css` — media queries (highest specificity by source order)

All files loaded via `<link>` in `<head>`. No `@import` (render-blocking).

### Glassmorphism Pattern

The controls panel uses `backdrop-filter: blur(14px)` with a semi-transparent `background`. Each theme's `--color-surface` includes the alpha channel. Fallback: opaque background when `backdrop-filter` is unsupported.

```css
.controls-panel {
  background: var(--color-surface, rgba(255,255,255,0.06));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
```

---

## 6. JavaScript Architecture

### Module Responsibilities

#### `utils.js`
- **`Scheduler`** object: `start(callback)` / `stop()`
  - Uses `setTimeout` aligned to the next exact second boundary: `1000 - (Date.now() % 1000)`
  - Returns a cleanup function
  - Wraps callback in try-catch so a single tick error never breaks the loop
- **`Storage`** object: `get(key, fallback)`, `set(key, value)`, both wrapped in try-catch
- **`DOM`** helpers: `getElement(selector)`, `getAll(selector)`, `createElement(tag, attrs)`
- **Constants**: card IDs array, stagger timing, cleanup margin

#### `FlipCard.js`
Class representing one physical flip card.

```
class FlipCard {
  #id           // string
  #el           // .flip-card element
  #topBack      // span reference
  #bottomBack   // span reference
  #topFront     // span reference
  #bottomFront  // span reference
  #cleanupTimer // timeout ID

  constructor(id)     → caches all 4 span refs via getElementById + querySelector
  get id()            → returns #id
  get currentValue()  → returns topFront.textContent
  update(newValue, { animate, stagger }) → animation setup + trigger
  reset(newValue)     → direct textContent update, no animation
  destroy()           → clears timer, nulls refs
}
```

The `update` method:
1. Reads `currentValue` from `topFront.textContent`
2. Guards: `if currentValue === newValue → return`
3. Clears previous `#cleanupTimer`
4. Removes `.flip-card--animate` class
5. Sets `topFront.textContent = currentValue` (old ≈ visible)
6. Sets `bottomBack.textContent = currentValue` (old ≈ hidden)
7. Sets `topBack.textContent = newValue` (new ≈ hidden)
8. Sets `bottomFront.textContent = newValue` (new ≈ hidden, rotated)
9. **Does NOT force reflow here** — delegated to FlipCardManager for batching
10. Returns `this` for chaining

#### `FlipCardManager.js`
Owns all 6 `FlipCard` instances and manages batch operations.

```
class FlipCardManager {
  #cards: Map<string, FlipCard>

  constructor()         → instantiates 6 FlipCards
  batchUpdate(values, { animate }) → batch reflow + staggered animate
  prepare(values)       → calls update() on each card (sets up, no reflow yet)
  commit(staggerMs)     → single reflow, then add --animate class with --stagger delays
  cleanup()             → resets all cards to final values, removes animation classes
  destroy()             → destroys all cards
}
```

`batchUpdate` flow:
1. `prepare()` — call `card.update(newValue)` on each card. This sets textContent but does NOT add the animation class.
2. Single reflow: `void document.body.offsetHeight`
3. `commit(staggerMs)` — for each card (in cascade order), set `--stagger` property, then add `--animate` class
4. `scheduleCleanup(timeout)` — single timeout that calls `cleanup()` after max stagger + animation duration

#### `ThemeManager.js`
```
class ThemeManager {
  #currentTheme     // string
  #el               // reference to theme buttons NodeList
  #meta             // reference to <meta id="theme-meta">

  constructor()                 → cache DOM refs
  get current()                 → returns #currentTheme
  apply(name)                   → set body.className, toggle button states,
                                   update meta, persist
  load()                        → read localStorage, apply saved or default
  #persist()                    → try localStorage.setItem
  #updateMeta(name)             → map theme → hex color, set meta.content
}
```

#### `FlipClock.js`
The main controller. Owns state and orchestrates all subsystems.

```
class FlipClock {
  #state = {
    is12Hour: false,
    isFirstTick: true,
    isVisible: true,
  }

  #cards          // FlipCardManager instance
  #themes         // ThemeManager instance
  #announcer      // .sr-only element reference
  #ampm           // #ampm-indicator reference
  #toggle         // #format-toggle reference

  constructor()                 → cache DOM, instantiate managers,
                                   bind events, load prefs, start scheduler
  #cacheDom()                   → getElementById calls
  #bindEvents()                 → format toggle change, theme button clicks,
                                   visibilitychange
  #tick()                       → read Date, compute digits, call cards.batchUpdate(),
                                   update AM/PM visibility + text,
                                   update screen reader text
  #announce(hours, minutes)     → set .sr-only textContent (only on minute change)
  #onVisibilityChange()         → stop/resume scheduler
  start()                       → called from constructor: first tick + schedule
  destroy()                     → stop scheduler, destroy managers, null refs
}
```

### Module Graph

```
app.js
  └── FlipClock.js
        ├── FlipCardManager.js
        │     └── FlipCard.js
        ├── ThemeManager.js
        └── utils.js (Scheduler, Storage)
```

All ES module imports (native, no bundler needed):

```html
<script type="module" src="js/app.js"></script>
```

`app.js` content:
```js
import { FlipClock } from './FlipClock.js';
document.addEventListener('DOMContentLoaded', () => {
  const clock = new FlipClock();
  // Expose for debugging:
  globalThis.__clock = clock;
});
```

---

## 7. Animation Pipeline

### Per-tick Timeline

One second of the clock's life, visualized:

```
Time 0ms ── Scheduler fires
            └── FlipClock._tick()
                  ├── Read Date.now()
                  ├── Compute hourStr, minutes, seconds
                  ├── Update AM/PM display
                  │
                  ├── FlipCardManager.batchUpdate({
                  │     [seconds-unit]: '3',  stagger: 0ms
                  │     [seconds-tens]: '5',  stagger: 30ms
                  │     [minutes-unit]: '9',  stagger: 60ms   ← only if changed
                  │     [minutes-tens]: '4',  stagger: 90ms
                  │     [hours-unit]: '1',    stagger: 120ms
                  │     [hours-tens]: '0',    stagger: 150ms
                  │   })
                  │     ├── prepare() — set textContent on all 4 layers
                  │     ├── void document.body.offsetHeight  ← SINGLE REFLOW
                  │     └── commit() — set --stagger, add --animate class
                  │
                  ├── _announce() — update sr-only text (if minute changed)
                  └── return

Time ~1ms ── CSS starts flipTop animation on each card
                    (delayed by respective --stagger values)

Time 180ms ── flipTop complete (top-front at rotateX(-90deg))
              flipBottom begins (bottom-front starts at rotateX(90deg))

Time 360ms ── flipBottom complete (bottom-front at rotateX(0deg))

Time 570ms ── Cleanup timeout fires
              └── FlipCardManager.cleanup()
                    → all cards: textContent = newValue, remove --animate class

Time 1000ms ── Next scheduler tick fires (aligned to system clock)
```

### Stagger Cascade

Right-to-left cascade creates a ripple effect. Rationale: least significant digit (seconds-unit) flips first because it changes most frequently. The eye tracks from right to left naturally.

| Position | ID | Stagger Delay |
|---|---|---|
| 0 (rightmost) | seconds-unit | 0ms |
| 1 | seconds-tens | 30ms |
| 2 | minutes-unit | 60ms |
| 3 | minutes-tens | 90ms |
| 4 | hours-unit | 120ms |
| 5 | hours-tens | 150ms |

### CSS Keyframe Design

```
@keyframes flip-top {
  0%   { transform: rotateX(0deg); }
  100% { transform: rotateX(-90deg); }
}

@keyframes flip-bottom {
  0%   { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}
```

Applied via animation trigger classes with `animation-fill-mode: forwards`:

```css
.flip-card--animate .flip-card__top-front {
  animation: flip-top var(--duration-flip-top) var(--ease-flip-top) forwards;
  animation-delay: var(--stagger, 0s);
}

.flip-card--animate .flip-card__bottom-front {
  animation: flip-bottom var(--duration-flip-bottom) var(--ease-flip-bottom) forwards;
  animation-delay: calc(var(--stagger, 0s) + var(--duration-flip-top));
}
```

### Visual Polish Elements

1. **Hinge Shadow**: A `::before` pseudo-element on `.flip-card` creates a radial gradient at the divider. During animation, its opacity transitions 0 → 0.3, giving the illusion of a card edge casting shadow as it lifts.

2. **Divider Line**: `::after` pseudo-element is a 1px line at 50% with slight inner shadow. Static — does not animate.

3. **Theme Crossfade**: All themed elements use `transition: ... 0.35s ease`. When a new theme class is applied to `<body>`, the browser smoothly interpolates all color/shadow changes.

### Animation Resource Usage

| Resource | Per tick | Notes |
|---|---|---|
| DOM reads | 0 | All refs cached at init |
| DOM writes | 24 | 6 cards × 4 spans (textContent) |
| Forced reflow | 1 | `document.body.offsetHeight` |
| setTimeout | 1 | Cleanup timer |
| CSS animations | Up to 6 running concurrently | GPU-accelerated transforms |

---

## 8. State Management

### Single Source of Truth

All mutable state lives in `FlipClock.#state`:

```typescript
interface ClockState {
  is12Hour: boolean;
  isFirstTick: boolean;
  isVisible: boolean;
}
```

Themes are managed by `ThemeManager` but `FlipClock` holds the reference (no redundant copy).

### State Mutation Rules

1. **Clock tick** → `FlipClock._tick()` reads `Date.now()` — stateless computation. The only mutation is `isFirstTick = false` after the first tick.
2. **Format toggle** → `FlipClock.#bindEvents` handler mutates `is12Hour`, persists, calls `_tick()`.
3. **Theme change** → `FlipClock.#bindEvents` handler calls `ThemeManager.apply()`.
4. **Visibility change** → Handler mutates `isVisible`, stops/resumes scheduler.

### Data Flow Diagram

```
                    ┌──────────────┐
                    │  Date.now()  │  ← external, immutable
                    └──────┬───────┘
                           ▼
              ┌─────────────────────────┐
              │  FlipClock._tick()      │
              │  ┌───────────────────┐  │
              │  │ Compute digits    │  │  ← pure function
              │  │ Compute period    │  │
              │  └────────┬──────────┘  │
              └───────────┼─────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
    ┌────────────┐ ┌───────────┐ ┌──────────────┐
    │ FlipCard   │ │ AM/PM DOM │ │ .sr-only DOM │
    │ Manager    │ │ (direct)  │ │ (direct)     │
    │            │ │           │ │              │
    │ batch      │ │           │ │              │
    │ Update()   │ │           │ │              │
    └────────────┘ └───────────┘ └──────────────┘
```

### Persistence

Only two values are persisted to `localStorage`:
- `clock-theme`: `"theme-dark" | "theme-light" | "theme-sage" | "theme-sakura"`
- `clock-format`: `true | false`

Theme is saved as a 4B string, format as a 5B JSON boolean. Combined < 50B.

All `localStorage` access is wrapped in `try-catch` in the `Storage` utility. Corruption or quota errors never crash the clock.

---

## 9. Event Flow

### Initialization Sequence

```
page load
  │
  ├── HTML parsed
  │     └── DOMContentLoaded fires
  │
  └── app.js init
        │
        ├── new FlipClock()
        │     ├── #cacheDom()       → 6 getElementById, 24 querySelector
        │     ├── new FlipCardManager()
        │     │     └── new FlipCard() ×6
        │     │           └── each caches 4 span refs
        │     ├── new ThemeManager()
        │     │     └── caches theme buttons, meta element
        │     ├── #bindEvents()
        │     │     ├── formatToggle change → handler
        │     │     ├── theme button click → handler
        │     │     └── document visibilitychange → handler
        │     ├── ThemeManager.load()
        │     │     ├── read localStorage
        │     │     ├── apply saved theme (or default 'theme-dark')
        │     │     └── set toggle state from saved format
        │     └── start()
        │           ├── #tick()      ← first tick (no animation)
        │           └── Scheduler.start()
        │                 └── setTimeout(..., delay)
        │
        └── clock starts ticking
```

### User Interaction Flow

**Theme selection:**
```
user clicks theme button
  → click event fires
  → FlipClock handler fires
  → ThemeManager.apply('theme-sage')
      → document.body.className = 'theme-sage'
      → .theme-btn.active toggling
      → theme-btn aria-checked toggling
      → theme-color meta content updated
      → localStorage.setItem('clock-theme', 'theme-sage')
  → CSS transitions animate all color/shadow changes over 0.35s
```

**Format toggle:**
```
user clicks toggle switch
  → change event fires (not click — more reliable for checkbox)
  → FlipClock handler fires
  → state.is12Hour = !state.is12Hour
  → Storage.set('clock-format', JSON.stringify(state.is12Hour))
  → FlipClock._tick()
      → cards.batchUpdate() — flips all digits to current time
      → AM/PM shows or hides
      → sr-only text updates
```

**Visibility change:**
```
user switches tab (page hidden)
  → visibilitychange → document.hidden === true
  → Scheduler.stop() — clearTimeout(timeoutId)

user returns to tab (page visible)
  → visibilitychange → document.hidden === false
  → FlipClock._tick() — immediate re-sync (no animation, uses isFirstTick pattern)
  → Scheduler.start() — resume tick loop
```

### Error Recovery

If `_tick()` throws during the scheduled callback, the error is caught, logged to console, and the scheduler continues:

```javascript
Scheduler.start(callback) {
  const tick = () => {
    const delay = 1000 - (Date.now() % 1000);
    this._timeoutId = setTimeout(() => {
      try { callback(); } catch (e) { console.error(e); }
      if (this._active) tick();
    }, delay);
  };
  tick();
}
```

The clock never stops ticking regardless of individual errors.

---

## 10. Theme System

### Architecture

Themes are implemented via CSS custom properties scoped to class selectors on `<body>`. Each theme class redefines the same set of variables. Components consume these variables — they never reference theme-specific values directly.

### Theme Contract (All themes MUST define)

```css
.theme-* {
  /* Backgrounds */
  --color-bg: ...;
  --color-card-bg: ...;
  --color-surface: ...;         /* controls panel */

  /* Text */
  --color-text: ...;

  /* Accents & Borders */
  --color-accent: ...;
  --color-border: ...;
  --color-hinge: ...;           /* flip card divider line */

  /* Shadows */
  --color-shadow: ...;          /* includes alpha */

  /* Interactive States */
  --color-ring: ...;            /* focus/active ring */

  /* Glow Effects */
  --color-glow: ...;
}
```

### Color Palettes

| Theme | BG | Card | Text | Accent | Hinge |
|---|---|---|---|---|---|
| Dark | `#0b0b0c` | `#18181a` | `#ffffff` | `#2a2a2c` | `rgba(0,0,0,0.15)` |
| Light | `#f2f2f7` | `#ffffff` | `#1d1d1f` | `#e5e5ea` | `rgba(0,0,0,0.08)` |
| Sage | `#e2e8e4` | `#ffffff` | `#4a5d4e` | `#cbd5ce` | `rgba(74,93,78,0.1)` |
| Sakura | `#fae8eb` | `#ffffff` | `#bd808a` | `#f3d1d6` | `rgba(189,128,138,0.1)` |

### Dynamic Browser Theme Color

The `<meta name="theme-color">` content attribute is updated via JS whenever the theme changes. This changes the browser chrome color (address bar, task switcher) to match the clock theme.

### OS Preference Auto-detection

On first visit (no saved theme), the clock respects `prefers-color-scheme`:
- `dark` → default to theme-dark
- `light` → default to theme-light
- `no-preference` → default to theme-dark

This is checked once at init in `ThemeManager.load()` via `window.matchMedia('(prefers-color-scheme: dark)')`.

---

## 11. Responsive System

### Strategy

Responsive sizing is built on `clamp()` for all dimensional properties. The clock shrinks/expands continuously as viewport width changes — no hard jumps at breakpoints. Breakpoints only change layout (column vs. row) and spacing, not component sizes.

### Sizing Formula

| Property | clamp() Expression | Min | Preferred | Max |
|---|---|---|---|---|
| Card width | `clamp(48px, 10vw, 120px)` | 48px | 10% of viewport | 120px |
| Card height | `clamp(72px, 15vw, 180px)` | 72px | (derived) | 180px |
| Font size | `clamp(36px, 7vw, 105px)` | 36px | — | 105px |
| Card radius | `clamp(8px, 1.5vw, 16px)` | 8px | — | 16px |
| Colon size | `clamp(40px, 7vw, 125px)` | 40px | — | 125px |
| AM/PM width | `clamp(50px, 7vw, 80px)` | 50px | — | 80px |
| AM/PM height | `clamp(36px, 5vw, 60px)` | 36px | — | 60px |

### Breakpoints

```
≥1200px ── Desktop
  768px ── Tablet
  480px ── Large phone
  380px ── Small phone
   320px ── Minimum supported
```

| Breakpoint | Controls | Container gap | Group gap | Notes |
|---|---|---|---|---|
| ≥1200px | Horizontal | `clamp(14px, 2vw, 28px)` | `clamp(6px, 1vw, 12px)` | Full experience |
| 768 ≤ x < 1200 | Horizontal | Tightens | Tightens | Smaller gaps |
| 480 ≤ x < 768 | Column | 10px | 6px | Controls stack vertically |
| < 480px | Column | 6px | 4px | Minimum padding |

### Key Differences from v1

- **No `transform: scale()` anywhere** — sizing is native via `clamp()` and fluid layout
- **Controls stack vertically** at ≤600px (was column at 600px, but with a scale hack at 380px)
- **Touch targets**: All interactive elements have minimum 44×44px tap area via `min-height` / `min-width` or `padding`
- **Flow**: Cards never overlap or overflow at any width

### Font

Google Fonts "Inter" weights 600/700/800. Fallback chain:
```
"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif
```

Inter has excellent number glyph consistency (tabular figures, same width per digit), making it ideal for a flip clock where digits must stay perfectly aligned as they change.

---

## 12. Performance Strategy

### Benchmark Targets

| Metric | Target | Measurement |
|---|---|---|
| FPS during flip | 60fps (no dropped frames) | Chrome DevTools Performance tab |
| Max paint time | < 5ms per frame | `frame` event in Performance tab |
| Forced reflow per second | Exactly 1 | Count `offsetHeight` reads |
| JS execution per tick | < 2ms | `performance.now()` wrapping `_tick()` |
| Memory (total page) | < 10MB | Chrome Task Manager |
| Time to interactive | < 1.5s | Lighthouse |
| Layout shifts | 0 CLS | Lighthouse |

### Optimization Techniques

**1. Zero DOM queries in hot path**
All element references are cached at construction time. The `_tick()` method performs exactly zero `querySelector` or `getElementById` calls.

**2. Batched forced reflow**
Instead of forcing reflow per-card (6× per tick), we force it once on `document.body` after all textContent is set but before any animation classes are added.

**3. GPU-accelerated animation**
All flip animation is driven by `transform: rotateX()` — a property the browser composites on the GPU. No `top`, `left`, `width`, `height` animations that trigger layout.

**4. `will-change: transform`**
Both `.flip-card__top-front` and `.flip-card__bottom-front` have `will-change: transform`, prompting the browser to promote them to their own compositor layers before animation starts.

**5. Page Visibility API**
When the tab is hidden, the scheduler stops entirely — no timers, no DOM updates, no reflow. On return, a single immediate tick re-syncs the display, then the scheduler resumes.

**6. Debounced animations**
Cards that haven't changed value are never updated. `oldValue === newValue` guard in `FlipCard.update()` prevents all unnecessary DOM writes.

**7. `transform: translateZ(0)` on flip cards**
Creates a compositing layer for the flip card container, preventing repainting of sibling elements during animation.

**8. No external runtime dependencies**
Zero JS libraries. The entire footprint is hand-written vanilla JS (~300 lines) + CSS (~530 lines) + HTML (~80 lines). No framework overhead, no virtual DOM, no bundle.

**9. CSS containment** (optional progressive enhancement)
```css
.flip-card {
  contain: layout style paint;
}
```
`contain: paint` clips the card's overflow without triggering paint of elements outside its bounds. `contain: layout` creates a new formatting context. This is a hint and does not change rendering behavior in supporting browsers.

---

## 13. Accessibility Strategy

### Screen Readers

**The problem with v1:** `aria-live="polite"` on the clock container caused screen readers to announce all 6 digits + AM/PM every second — extremely verbose and distracting.

**v2 solution:** A dedicated visually-hidden `.sr-only` region outside the visual clock:

```html
<div class="sr-only" id="clock-announcer" aria-live="polite" aria-atomic="true"></div>
```

- The visual clock (`role="timer"`) has its internal flip groups marked `aria-hidden="true"` so AT ignores the raw digit elements.
- The `.sr-only` region is updated ONLY when the minute changes (not every second).
- Announcement format: "10:45 AM" (or "22:45" in 24h mode).
- `aria-atomic="true"` ensures the entire string is announced, not just the changed portion.

**Additionally:**
- `role="timer"` on `.clock-container` tells AT this is a live timer.
- The colons are `aria-hidden="true"` (purely decorative separators).

### Keyboard Navigation

| Element | Interaction | Visual feedback |
|---|---|---|
| Format toggle | Tab to focus, Space to toggle | `focus-visible` outline |
| Theme buttons | Tab between, Arrow keys in radiogroup (optional), Space/Enter to select | `focus-visible` outline + active ring |

### prefer-reduced-motion

All animations are disabled when the user's OS is set to reduce motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .flip-card__top-front { transform: none !important; }
  .flip-card__bottom-front { transform: none !important; }
  .colon { animation: none !important; opacity: 1 !important; }
}
```

Cards snap instantly to their new value without transition. Colon stays solid. Theme changes are instant.

### Color Contrast

All theme combinations meet or exceed WCAG AA (4.5:1 ratio for normal text, 3:1 for large text). The flip clock digits use `--color-text` against `--color-card-bg`, which in the dark theme is `#ffffff` on `#18181a` — a ratio of ~14:1.

### Focus Indicators

All interactive elements have visible focus styles:
- `outline: 3px solid #4da3ff; outline-offset: 3px;`
- Only shown on keyboard focus (via `:focus-visible`), never on mouse click

### Touch Targets

All interactive controls have minimum 44×44px touch target:
- Theme buttons: 28×28px + 12px gap + 8px padding = effective 40×40 (close). Mitigated by increasing tap area via transparent 8px pseudo-border.
- Toggle switch: 50×26px + label = well over 44px.

---

## 14. Cross-browser Strategy

### Supported Browsers

| Browser | Min version | Notes |
|---|---|---|
| Chrome | 84+ | Full support |
| Firefox | 80+ | Full support |
| Safari | 14.1+ | Requires `-webkit-` prefixes for `backdrop-filter` |
| Edge | 84+ | Full support |
| Samsung Internet | 14+ | Chrome-based, full support |
| Opera | 70+ | Chrome-based, full support |
| IE11 | ❌ | Not supported |

### Vendor Prefixes

Used only where required:
- `-webkit-backdrop-filter` for Safari's implementation of `backdrop-filter`
- `-webkit-backface-visibility` for Safari's implementation of `backface-visibility`

All transforms, animations, and transitions use standard unprefixed properties (supported since IE10/Safari 9).

### Graceful Degradation

| Feature | Fallback |
|---|---|
| `backdrop-filter` | Opaque `background` via `--color-surface` (alpha included in hex or rgba) |
| `clamp()` | Not polyfillable; min/max values chosen so degradation at unsupported browsers still renders acceptably |
| `CSS custom properties` | Not polyfillable; theme classes set both the variable AND full properties on elements as a last resort (not implemented — pre-IE11 Edge only, negligible traffic) |
| `will-change` | Ignored by unsupported browsers; no functional impact |
| `prefers-reduced-motion` | Ignored by unsupported browsers; animations always run |
| `scrollbar-width` | Ignored by WebKit; still renders default scrollbar |
| ES6 classes + modules | Not polyfilled; modern browsers only |

---

## 15. Open Questions for Implementation

1. **Should the colon blink pause when the clock is frozen (page hidden)?** Likely yes — consistent with the Page Visibility approach.

2. **Should there be a "seconds" toggle to hide seconds?** Possible premium feature — reduces flip frequency and visual noise. Could be a third control alongside 12h toggle.

3. **Should the clock save the "seconds visible" state?** If implemented, yes — consistent persistence approach.

4. **Should there be a date display beneath the clock?** Shows the current date below the time. Common in premium clocks. Could be a subtle addition without distracting from the flip clock.

5. **Should the clock support 10+ themes via an extensible system?** The CSS custom property contract makes this trivial — just add `.theme-xxx { ... }` with the required variables. A future feature could allow user-created themes.

---

## 16. Summary of Architecture Decisions

| Decision | Choice | Alternative considered |
|---|---|---|
| Framework | None (vanilla JS) | React, Svelte, Vue |
| Module system | ES modules (native) | IIFE, bundler (Webpack/Vite) |
| CSS methodology | Custom properties + BEM | CSS Modules, Tailwind, Styled Components |
| Animation engine | CSS keyframes | Web Animations API, GSAP, Framer Motion |
| State container | Class property (`#state`) | Zustand, Redux, external store |
| Persistence | `localStorage` | IndexedDB, cookies |
| Font delivery | `<link>` with preconnect | `@import`, self-hosted |
| Responsive method | `clamp()` + breakpoints | Container queries, fluid typography calc() |
| Build step | None | Vite, Webpack, Parcel |
| Accessibility layer | `.sr-only` + ARIA attributes | aria-live on visual elements (v1 approach — rejected) |
