// ======================================================
// Live Flip Clock
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

    // Remove existing theme classes
    document.body.classList.remove(
        "theme-dark",
        "theme-light",
        "theme-sage",
        "theme-sakura"
    );

    // Add selected theme
    document.body.classList.add(themeName);

    // Highlight active button
    themeButtons.forEach(btn => btn.classList.remove("active"));

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
// Flip Card Update
// -----------------------------

function updateCard(cardId, newValue) {

    const card = document.getElementById(cardId);

    if (!card) return;

    const top = card.querySelector(".top");
    const bottom = card.querySelector(".bottom");

    if (!top || !bottom) return;

    const currentValue = top.textContent;

    if (currentValue === newValue) return;

    // Restart animation
    card.classList.remove("animate");

    void card.offsetWidth;

    top.textContent = newValue;
    bottom.textContent = newValue;

    card.classList.add("animate");
}

// -----------------------------
// Clock Logic
// -----------------------------

function runClock() {

    const now = new Date();

    let hours = now.getHours();

    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (is12HourFormat) {

        const period = hours >= 12 ? "PM" : "AM";

        ampmIndicator.textContent = period;
        ampmIndicator.style.display = "block";

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
// Accurate Timer
// -----------------------------

function startClock() {

    runClock();

    const delay = 1000 - (Date.now() % 1000);

    setTimeout(startClock, delay);

}

// -----------------------------
// Event Listeners
// -----------------------------

formatToggle.addEventListener("change", (event) => {

    is12HourFormat = event.target.checked;

    localStorage.setItem(
        "clock-format",
        JSON.stringify(is12HourFormat)
    );

    runClock();

});

themeButtons.forEach(button => {

    button.addEventListener("click", () => {

        const theme = button.dataset.theme;

        setTheme(theme);

    });

});

// -----------------------------
// Load Saved Preferences
// -----------------------------

function initializeClock() {

    // Theme
    const savedTheme =
        localStorage.getItem("clock-theme") || "theme-dark";

    setTheme(savedTheme);

    // Time Format
    const savedFormat =
        JSON.parse(localStorage.getItem("clock-format"));

    if (savedFormat !== null) {

        is12HourFormat = savedFormat;
        formatToggle.checked = savedFormat;

    }

    startClock();

}

// -----------------------------
// Start
// -----------------------------

initializeClock();
