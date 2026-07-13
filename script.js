// ======================================================
// Live Flip Clock
// Author: Arisudan
// ======================================================

// -----------------------------
// Application State
// -----------------------------

let is12HourFormat = false;

// -----------------------------
// DOM Elements
// -----------------------------

const formatToggle = document.getElementById("format-toggle");
const ampmIndicator = document.getElementById("ampm-indicator");
const themeButtons = document.querySelectorAll(".theme-btn");

// -----------------------------
// Theme Engine
// -----------------------------

function setTheme(themeName) {

    // Remove old themes
    document.body.classList.remove(
        "theme-dark",
        "theme-light",
        "theme-sage",
        "theme-sakura"
    );

    // Apply new theme
    document.body.classList.add(themeName);

    // Highlight active button
    themeButtons.forEach(button =>
        button.classList.remove("active")
    );

    const activeButton = document.querySelector(
        `[data-theme="${themeName}"]`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }

    // Save preference
    localStorage.setItem("clock-theme", themeName);
}

// -----------------------------
// Flip Card Animation
// -----------------------------

function updateCard(cardId, value) {

    const card = document.getElementById(cardId);

    if (!card) return;

    const top = card.querySelector(".top");
    const bottom = card.querySelector(".bottom");

    if (!top || !bottom) return;

    if (top.textContent === value) return;

    card.classList.remove("animate");

    // Restart animation
    void card.offsetWidth;

    top.textContent = value;
    bottom.textContent = value;

    card.classList.add("animate");

}

// -----------------------------
// Update Clock
// -----------------------------

function runClock() {

    const now = new Date();

    let hours = now.getHours();

    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (is12HourFormat) {

        const period = hours >= 12 ? "PM" : "AM";

        ampmIndicator.style.display = "flex";
        ampmIndicator.textContent = period;

        hours = hours % 12 || 12;

    } else {

        ampmIndicator.style.display = "none";

    }

    const hourString = String(hours).padStart(2, "0");

    updateCard("hours-tensor", hourString[0]);
    updateCard("hours-unit", hourString[1]);

    updateCard("minutes-tensor", minutes[0]);
    updateCard("minutes-unit", minutes[1]);

    updateCard("seconds-tensor", seconds[0]);
    updateCard("seconds-unit", seconds[1]);

}

// -----------------------------
// Accurate Clock Scheduler
// -----------------------------

function scheduleClock() {

    runClock();

    const delay = 1000 - (Date.now() % 1000);

    setTimeout(scheduleClock, delay);

}

// -----------------------------
// Theme Button Events
// -----------------------------

themeButtons.forEach(button => {

    button.addEventListener("click", () => {

        setTheme(button.dataset.theme);

    });

});

// -----------------------------
// Format Toggle
// -----------------------------

formatToggle.addEventListener("change", event => {

    is12HourFormat = event.target.checked;

    localStorage.setItem(
        "clock-format",
        JSON.stringify(is12HourFormat)
    );

    runClock();

});

// -----------------------------
// Load User Preferences
// -----------------------------

function loadPreferences() {

    // Theme
    const savedTheme =
        localStorage.getItem("clock-theme") ||
        "theme-dark";

    setTheme(savedTheme);

    // Clock Format
    const savedFormat =
        JSON.parse(
            localStorage.getItem("clock-format")
        );

    if (savedFormat !== null) {

        is12HourFormat = savedFormat;

        formatToggle.checked = savedFormat;

    }

}

// -----------------------------
// Initialize
// -----------------------------

function initializeClock() {

    loadPreferences();

    scheduleClock();

}

// Start Application

initializeClock();
