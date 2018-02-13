'use strict';

document.addEventListener('input', ({target}) => {
  if (target.id.indexOf('-range') !== -1) {
    target.parentNode.querySelector('span').textContent = parseInt(target.value * 100) + '%';
  }
});

document.addEventListener('input', ({target}) => {
  if (target.id.indexOf('-range') !== -1) {
    chrome.storage.local.set({
      [target.id]: 1 - target.value
    });
  }
  else {
    chrome.storage.local.set({
      [target.id]: target.value
    });
  }
});

chrome.storage.local.get({
  'day-time': '08:00',
  'night-time': '19:00',
  'day-range': 0.1,
  'night-range': 0.2
}, prefs => {
  document.getElementById('day-time').value = prefs['day-time'];
  document.getElementById('night-time').value = prefs['night-time'];
  document.getElementById('day-range').value = 1 - prefs['day-range'];
  document.getElementById('day-range').dispatchEvent(new Event('input', {
    bubbles: true
  }));
  document.getElementById('night-range').value = 1 - prefs['night-range'];
  document.getElementById('night-range').dispatchEvent(new Event('input', {
    bubbles: true
  }));
});
