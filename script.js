"use strict";

class LiveFlipClock {
  constructor() {
    this._state = {
      is12Hour: false,
      theme: "theme-dark",
      timeoutId: null,
      isVisible: true,
      isFirstTick: true,
    };

    this._elements = {
      formatToggle: null,
      ampmIndicator: null,
      announcer: null,
      themeMeta: null,
      themeBtns: null,
      cards: {},
    };

    this._init();
  }

  // ---- Initialization ----

  _init() {
    this._cacheDom();
    this._bindEvents();
    this._loadPreferences();
    this._watchVisibility();
    this._start();
  }

  _cacheDom() {
    this._elements.formatToggle = document.getElementById("format-toggle");
    this._elements.ampmIndicator = document.getElementById("ampm-indicator");
    this._elements.announcer = document.getElementById("clock-announcer");
    this._elements.themeMeta = document.getElementById("theme-meta");
    this._elements.themeBtns = document.querySelectorAll(".theme-btn");

    const ids = [
      "hours-tens", "hours-unit",
      "minutes-tens", "minutes-unit",
      "seconds-tens", "seconds-unit",
    ];

    for (const id of ids) {
      const card = document.getElementById(id);
      this._elements.cards[id] = {
        card,
        topBack: card && card.querySelector(".flip-card__top-back span"),
        bottomBack: card && card.querySelector(".flip-card__bottom-back span"),
        topFront: card && card.querySelector(".flip-card__top-front span"),
        bottomFront: card && card.querySelector(".flip-card__bottom-front span"),
      };
    }
  }

  _bindEvents() {
    this._elements.formatToggle.addEventListener("change", (e) => {
      this._state.is12Hour = e.target.checked;
      try {
        localStorage.setItem("clock-format", JSON.stringify(this._state.is12Hour));
      } catch (_) { /* storage full or unavailable */ }
      this._tick();
    });

    this._elements.themeBtns.forEach((btn) => {
      btn.addEventListener("click", () => this._setTheme(btn.dataset.theme));
    });
  }

  // ---- Theme Engine ----

  _setTheme(name) {
    const body = document.body;
    body.className = name;
    this._state.theme = name;

    this._elements.themeBtns.forEach((btn) => {
      const isActive = btn.dataset.theme === name;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-checked", isActive);
    });

    this._updateThemeMeta(name);

    try {
      localStorage.setItem("clock-theme", name);
    } catch (_) { /* storage full or unavailable */ }
  }

  _updateThemeMeta(name) {
    const colors = {
      "theme-dark": "#0b0b0c",
      "theme-light": "#f2f2f7",
      "theme-sage": "#e2e8e4",
      "theme-sakura": "#fae8eb",
    };
    const meta = this._elements.themeMeta;
    if (meta) meta.content = colors[name] || "#0b0b0c";
  }

  // ---- Preferences ----

  _loadPreferences() {
    try {
      const savedTheme = localStorage.getItem("clock-theme");
      if (savedTheme && savedTheme.startsWith("theme-")) {
        this._setTheme(savedTheme);
      }

      const savedFormat = JSON.parse(localStorage.getItem("clock-format"));
      if (savedFormat !== null) {
        this._state.is12Hour = !!savedFormat;
        this._elements.formatToggle.checked = !!savedFormat;
      }
    } catch (_) {
      // Corrupted localStorage — use defaults
    }
  }

  // ---- Flip Card Animation ----

  _updateCard(cardId, value, animate) {
    const parts = this._elements.cards[cardId];
    if (!parts || !parts.card) return;

    const { card, topBack, bottomBack, topFront, bottomFront } = parts;
    if (!topBack || !bottomBack || !topFront || !bottomFront) return;

    const oldValue = topFront.textContent;
    if (oldValue === value) return;

    // Clear pending cleanup
    if (card._cleanupTimer) {
      clearTimeout(card._cleanupTimer);
      card._cleanupTimer = null;
    }

    card.classList.remove("animate");

    if (animate) {
      topFront.textContent = oldValue;
      bottomBack.textContent = oldValue;
      topBack.textContent = value;
      bottomFront.textContent = value;

      // Force reflow
      void card.offsetWidth;

      card.classList.add("animate");

      card._cleanupTimer = setTimeout(() => {
        card.classList.remove("animate");
        topFront.textContent = value;
        bottomBack.textContent = value;
        topBack.textContent = value;
        bottomFront.textContent = value;
        card._cleanupTimer = null;
      }, 420);
    } else {
      // No animation — set directly
      topFront.textContent = value;
      bottomBack.textContent = value;
      topBack.textContent = value;
      bottomFront.textContent = value;
    }
  }

  // ---- Clock Tick ----

  _tick() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (this._state.is12Hour) {
      const period = hours >= 12 ? "PM" : "AM";
      this._elements.ampmIndicator.textContent = period;
      this._elements.ampmIndicator.style.display = "flex";
      hours = hours % 12 || 12;
    } else {
      this._elements.ampmIndicator.style.display = "none";
    }

    const hourStr = String(hours).padStart(2, "0");

    // Cascade stagger from least to most significant digit (right to left)
    const staggerMs = 30;
    const digits = [
      { id: "seconds-unit", val: seconds[1], delay: 0 },
      { id: "seconds-tens", val: seconds[0], delay: staggerMs },
      { id: "minutes-unit", val: minutes[1], delay: staggerMs * 2 },
      { id: "minutes-tens", val: minutes[0], delay: staggerMs * 3 },
      { id: "hours-unit", val: hourStr[1], delay: staggerMs * 4 },
      { id: "hours-tens", val: hourStr[0], delay: staggerMs * 5 },
    ];

    const animate = !this._state.isFirstTick;

    for (const { id, val, delay } of digits) {
      const parts = this._elements.cards[id];
      if (!parts || !parts.card) continue;
      parts.card.style.setProperty("--stagger", `${delay}ms`);
      this._updateCard(id, val, animate);
    }

    if (this._state.isFirstTick) {
      this._state.isFirstTick = false;
    }

    // Screen reader announcement (only on meaningful changes)
    this._announceTime(hours, now.getMinutes(), now.getHours() >= 12 ? "PM" : "AM");
  }

  _announceTime(hours, minutes, period) {
    if (!this._elements.announcer) return;

    const h = this._state.is12Hour ? hours : hours;
    const m = String(minutes).padStart(2, "0");
    const p = this._state.is12Hour ? ` ${period}` : "";
    const text = `${h}:${m}${p}`;

    // Only announce when minute changes to avoid spam
    if (this._elements.announcer.textContent !== text) {
      this._elements.announcer.textContent = text;
    }
  }

  // ---- Scheduling ----

  _schedule() {
    const delay = 1000 - (Date.now() % 1000);
    this._state.timeoutId = setTimeout(() => {
      try {
        this._tick();
      } catch (err) {
        console.error("Clock tick error:", err);
      }
      if (this._state.isVisible) {
        this._schedule();
      }
    }, delay);
  }

  _start() {
    this._tick();
    this._schedule();
  }

  _stop() {
    if (this._state.timeoutId !== null) {
      clearTimeout(this._state.timeoutId);
      this._state.timeoutId = null;
    }
  }

  // ---- Page Visibility ----

  _watchVisibility() {
    document.addEventListener("visibilitychange", () => {
      this._state.isVisible = !document.hidden;
      if (document.hidden) {
        this._stop();
      } else {
        // Re-sync immediately, then restart scheduling
        this._tick();
        this._schedule();
      }
    });
  }

  // ---- Cleanup ----

  destroy() {
    this._stop();
    for (const id in this._elements.cards) {
      const parts = this._elements.cards[id];
      if (parts && parts.card && parts.card._cleanupTimer) {
        clearTimeout(parts.card._cleanupTimer);
      }
    }
  }
}

// ---- Bootstrap ----

document.addEventListener("DOMContentLoaded", () => {
  window._clock = new LiveFlipClock();
});
