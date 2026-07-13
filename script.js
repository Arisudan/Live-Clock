let is12HourFormat = false;

// 1. Theme Switcher Engine
function setTheme(themeName) {
  document.body.className = themeName;
  
  // Update active state class handles across custom selectors
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.btn-${themeName.replace('theme-', '')}`);
  if (activeBtn) activeBtn.classList.add('active');
}

// 2. Element DOM Flip Injector logic
function updateCard(cardId, newValue) {
  const card = document.getElementById(cardId);
  const topSegment = card.querySelector('.top');
  const bottomSegment = card.querySelector('.bottom');
  const currentValue = topSegment.innerText;
  
  if (currentValue === newValue) return;

  card.classList.remove('animate');
  void card.offsetWidth; // Force CSS layout recalculation reflow
  
  topSegment.innerText = newValue;
  bottomSegment.innerText = newValue;
  card.classList.add('animate');
}

// 3. Central System Clock Core Loop
function runClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const ampmIndicator = document.getElementById('ampm-indicator');

  if (is12HourFormat) {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    ampmIndicator.innerText = ampm;
    ampmIndicator.style.display = 'block';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle structural '0' hour edge evaluation down to 12
  } else {
    ampmIndicator.style.display = 'none';
  }

  const hoursStr = String(hours).padStart(2, '0');

  // Push updates slice by slice down to dual-digit targets
  updateCard('hours-tensor', hoursStr[0]);
  updateCard('hours-unit', hoursStr[1]);
  updateCard('minutes-tensor', minutes[0]);
  updateCard('minutes-unit', minutes[1]);
  updateCard('seconds-tensor', seconds[0]);
  updateCard('seconds-unit', seconds[1]);
}

// 4. Input Listener Initializations
document.getElementById('format-toggle').addEventListener('change', (e) => {
  is12HourFormat = e.target.checked;
  runClock(); // Refresh instantly without waiting next second layout pass
});

setInterval(runClock, 1000);
runClock();
