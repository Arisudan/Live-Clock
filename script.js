/* ==========================================================
   Live Flip Clock
   Author : Arisudan
   ========================================================== */

/* ==========================================================
   APPLICATION STATE
   ========================================================== */

const App = {

    is12Hour: false,

    currentTheme: "theme-dark",

    initialized: false

};

/* ==========================================================
   DOM CACHE
   ========================================================== */

const DOM = {

    body: document.body,

    formatToggle: document.getElementById("format-toggle"),

    ampm: document.getElementById("ampm-indicator"),

    themeButtons: document.querySelectorAll(".theme-btn"),

    cards: {

        hoursTens: document.getElementById("hours-tensor"),

        hoursUnits: document.getElementById("hours-unit"),

        minutesTens: document.getElementById("minutes-tensor"),

        minutesUnits: document.getElementById("minutes-unit"),

        secondsTens: document.getElementById("seconds-tensor"),

        secondsUnits: document.getElementById("seconds-unit")

    }

};

/* ==========================================================
   STORAGE KEYS
   ========================================================== */

const STORAGE = {

    THEME: "flip-clock-theme",

    FORMAT: "flip-clock-format"

};

/* ==========================================================
   UTILITIES
   ========================================================== */

function saveSetting(key, value){

    localStorage.setItem(

        key,

        JSON.stringify(value)

    );

}

function loadSetting(key, fallback){

    const value = localStorage.getItem(key);

    if(value === null){

        return fallback;

    }

    try{

        return JSON.parse(value);

    }

    catch{

        return fallback;

    }

}

/* ==========================================================
   THEME ENGINE
   ========================================================== */

function clearThemes(){

    DOM.body.classList.remove(

        "theme-dark",

        "theme-light",

        "theme-sage",

        "theme-sakura"

    );

}

function activateThemeButton(theme){

    DOM.themeButtons.forEach(button=>{

        button.classList.remove("active");

    });

    const activeButton=document.querySelector(

        `[data-theme="${theme}"]`

    );

    if(activeButton){

        activeButton.classList.add("active");

    }

}

function setTheme(theme){

    clearThemes();

    DOM.body.classList.add(theme);

    activateThemeButton(theme);

    App.currentTheme=theme;

    saveSetting(

        STORAGE.THEME,

        theme

    );

}

/* ==========================================================
   FORMAT ENGINE
   ========================================================== */

function setTimeFormat(is12Hour){

    App.is12Hour=is12Hour;

    DOM.formatToggle.checked=is12Hour;

    saveSetting(

        STORAGE.FORMAT,

        is12Hour

    );

}

/* ==========================================================
   LOAD USER SETTINGS
   ========================================================== */

function loadUserPreferences(){

    const savedTheme=

        loadSetting(

            STORAGE.THEME,

            "theme-dark"

        );

    const savedFormat=

        loadSetting(

            STORAGE.FORMAT,

            false

        );

    setTheme(savedTheme);

    setTimeFormat(savedFormat);

}

/* ==========================================================
   EVENT REGISTRATION
   ========================================================== */

function registerThemeButtons(){

    DOM.themeButtons.forEach(button=>{

        button.addEventListener(

            "click",

            ()=>{

                setTheme(

                    button.dataset.theme

                );

            }

        );

    });

}

function registerFormatToggle(){

    DOM.formatToggle.addEventListener(

        "change",

        event=>{

            setTimeFormat(

                event.target.checked

            );

            updateClock();

        }

    );

}
/* ==========================================================
   CLOCK ENGINE
========================================================== */

function getCurrentTime(){

    const now = new Date();

    let hours = now.getHours();

    let period = "";

    if(App.is12Hour){

        period = hours >= 12 ? "PM" : "AM";

        hours = hours % 12;

        hours = hours || 12;

    }

    return{

        hours:String(hours).padStart(2,"0"),

        minutes:String(now.getMinutes()).padStart(2,"0"),

        seconds:String(now.getSeconds()).padStart(2,"0"),

        period

    };

}

/* ==========================================================
   UPDATE AM / PM
========================================================== */

function updatePeriod(period){

    if(App.is12Hour){

        DOM.ampm.classList.add("show");

        DOM.ampm.textContent = period;

    }

    else{

        DOM.ampm.classList.remove("show");

    }

}

/* ==========================================================
   GET DIGIT
========================================================== */

function getDigit(card){

    return card.querySelector(".top").textContent;

}

/* ==========================================================
   SET DIGIT
========================================================== */

function setDigit(card,value){

    card.querySelector(".top").textContent=value;

    card.querySelector(".bottom").textContent=value;

}

/* ==========================================================
   FLIP CARD
========================================================== */

function flipCard(card,newValue){

    const current=getDigit(card);

    if(current===newValue){

        return;

    }

    card.classList.remove("animate");

    void card.offsetWidth;

    setDigit(card,newValue);

    card.classList.add("animate");

}

/* ==========================================================
   UPDATE HOURS
========================================================== */

function updateHours(value){

    flipCard(

        DOM.cards.hoursTens,

        value[0]

    );

    flipCard(

        DOM.cards.hoursUnits,

        value[1]

    );

}

/* ==========================================================
   UPDATE MINUTES
========================================================== */

function updateMinutes(value){

    flipCard(

        DOM.cards.minutesTens,

        value[0]

    );

    flipCard(

        DOM.cards.minutesUnits,

        value[1]

    );

}

/* ==========================================================
   UPDATE SECONDS
========================================================== */

function updateSeconds(value){

    flipCard(

        DOM.cards.secondsTens,

        value[0]

    );

    flipCard(

        DOM.cards.secondsUnits,

        value[1]

    );

}

/* ==========================================================
   UPDATE CLOCK
========================================================== */

function updateClock(){

    const time=getCurrentTime();

    updateHours(

        time.hours

    );

    updateMinutes(

        time.minutes

    );

    updateSeconds(

        time.seconds

    );

    updatePeriod(

        time.period

    );

}
/* ==========================================================
   HIGH PRECISION CLOCK SCHEDULER
========================================================== */

let clockTimer = null;

function scheduleNextTick() {

    const now = Date.now();

    const delay = 1000 - (now % 1000);

    clockTimer = setTimeout(() => {

        updateClock();

        scheduleNextTick();

    }, delay);

}

/* ==========================================================
   START CLOCK
========================================================== */

function startClock() {

    if (clockTimer) {

        clearTimeout(clockTimer);

    }

    updateClock();

    scheduleNextTick();

}

/* ==========================================================
   STOP CLOCK
========================================================== */

function stopClock() {

    if (clockTimer) {

        clearTimeout(clockTimer);

        clockTimer = null;

    }

}

/* ==========================================================
   PAGE VISIBILITY
========================================================== */

function handleVisibilityChange() {

    if (document.hidden) {

        stopClock();

    } else {

        startClock();

    }

}

/* ==========================================================
   REMOVE ANIMATION CLASS
========================================================== */

function registerAnimationCleanup() {

    Object.values(DOM.cards).forEach(card => {

        card.addEventListener("animationend", () => {

            card.classList.remove("animate");

        });

    });

}

/* ==========================================================
   KEYBOARD SHORTCUTS
========================================================== */

function registerKeyboardShortcuts() {

    document.addEventListener("keydown", event => {

        switch (event.key.toLowerCase()) {

            case "t":

                DOM.formatToggle.click();

                break;

            case "1":

                setTheme("theme-dark");

                break;

            case "2":

                setTheme("theme-light");

                break;

            case "3":

                setTheme("theme-sage");

                break;

            case "4":

                setTheme("theme-sakura");

                break;

            default:

                break;

        }

    });

}

/* ==========================================================
   REGISTER EVENTS
========================================================== */

function registerEvents() {

    registerThemeButtons();

    registerFormatToggle();

    registerAnimationCleanup();

    registerKeyboardShortcuts();

    document.addEventListener(

        "visibilitychange",

        handleVisibilityChange

    );

}

/* ==========================================================
   PERFORMANCE
========================================================== */

function warmUpClock() {

    requestAnimationFrame(() => {

        updateClock();

    });

}

/* ==========================================================
   STARTUP CHECK
========================================================== */

function verifyDOM() {

    if (!DOM.formatToggle) {

        console.error("Format toggle not found.");

        return false;

    }

    if (!DOM.ampm) {

        console.error("AM/PM indicator not found.");

        return false;

    }

    for (const key in DOM.cards) {

        if (!DOM.cards[key]) {

            console.error(`Missing clock card: ${key}`);

            return false;

        }

    }

    return true;

}
/* ==========================================================
   INITIALIZE APPLICATION
========================================================== */

function initialize() {

    // Prevent double initialization
    if (App.initialized) {

        return;

    }

    // Verify required DOM elements
    if (!verifyDOM()) {

        console.error("Clock initialization failed.");

        return;

    }

    // Load saved user settings
    loadUserPreferences();

    // Register all event listeners
    registerEvents();

    // Warm up UI
    warmUpClock();

    // Start clock
    startClock();

    App.initialized = true;

    console.log("Live Flip Clock Initialized Successfully");

}

/* ==========================================================
   SELF TEST
========================================================== */

function selfTest() {

    const tests = [

        DOM.formatToggle,

        DOM.ampm,

        DOM.cards.hoursTens,

        DOM.cards.hoursUnits,

        DOM.cards.minutesTens,

        DOM.cards.minutesUnits,

        DOM.cards.secondsTens,

        DOM.cards.secondsUnits

    ];

    const passed = tests.every(item => item !== null);

    if (passed) {

        console.log("DOM Test : PASSED");

    }

    else {

        console.warn("DOM Test : FAILED");

    }

    return passed;

}

/* ==========================================================
   PERFORMANCE LOG
========================================================== */

function logPerformance() {

    if (!window.performance) {

        return;

    }

    const navigation = performance.getEntriesByType("navigation")[0];

    if (navigation) {

        console.log(

            `Page Loaded in ${navigation.loadEventEnd.toFixed(2)} ms`

        );

    }

}

/* ==========================================================
   WINDOW EVENTS
========================================================== */

window.addEventListener("load", () => {

    initialize();

    selfTest();

    logPerformance();

});

/* ==========================================================
   HANDLE PAGE RESTORE
========================================================== */

window.addEventListener("pageshow", () => {

    if (!App.initialized) {

        initialize();

    }

});

/* ==========================================================
   HANDLE PAGE UNLOAD
========================================================== */

window.addEventListener("beforeunload", () => {

    stopClock();

});

/* ==========================================================
   OPTIONAL DEBUG API
========================================================== */

window.LiveFlipClock = {

    start: startClock,

    stop: stopClock,

    update: updateClock,

    setTheme: setTheme,

    setTimeFormat: setTimeFormat,

    state: App

};

/* ==========================================================
   END OF FILE
========================================================== */
