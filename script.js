function updateCard(cardId, newValue) {
  const card = document.getElementById(cardId);
  const topSegment = card.querySelector('.top');
  const bottomSegment = card.querySelector('.bottom');
  
  const currentValue = topSegment.innerText;
  
  if (currentValue === newValue) return;

  // Trigger CSS redraw animations
  card.classList.remove('animate');
  void card.offsetWidth; // Reflow reset hook
  
  topSegment.innerText = newValue;
  bottomSegment.innerText = newValue;
  card.classList.add('animate');
}

function runClock() {
  const now = new Date();
  
  // Format elements down to 2 digits
  const hrs = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');

  // Push segmented variables to DOM structure
  updateCard('hours-tensor', hrs[0]);
  updateCard('hours-unit', hrs[1]);
  updateCard('minutes-tensor', mins[0]);
  updateCard('minutes-unit', mins[1]);
  updateCard('seconds-tensor', secs[0]);
  updateCard('seconds-unit', secs[1]);
}

// Instantiate internal processing interval loops
setInterval(runClock, 1000);
runClock();
