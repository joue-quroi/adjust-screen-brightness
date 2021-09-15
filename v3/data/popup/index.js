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

let tab;
chrome.tabs.query({
  currentWindow: true,
  active: true
}, tabs => {
  console.log(1);
  tab = tabs[0];
  try {
    const {hostname, protocol} = new URL(tab.url);
    console.log(3);
    if (protocol === 'http:' || protocol === 'https:') {
      chrome.storage.local.get({
        exceptions: []
      }, prefs => {
        if (prefs.exceptions.indexOf(hostname) === -1) {
          document.getElementById('disable').disabled = false;
        }
        else {
          document.getElementById('enable').disabled = false;
        }
      });
    }
    // do we have injection
    chrome.tabs.sendMessage(tab.id, {
      method: 'ping'
    }, r => {
      chrome.runtime.lastError;
      if (r !== 'pong') {
        chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          files: ['/data/inject.js']
        }).catch(() => {});
      }
    });
  }
  catch (e) {}
});

document.getElementById('disable').addEventListener('click', e => {
  chrome.storage.local.get({
    exceptions: []
  }, prefs => {
    const {hostname} = new URL(tab.url);
    prefs.exceptions.push(hostname);
    chrome.storage.local.set(prefs);
    // just in case js is not injected
    chrome.action.setIcon({
      tabId: tab.id,
      path: {
        16: '/data/icons/disabled/16.png',
        32: '/data/icons/disabled/32.png'
      }
    });
    e.target.disabled = true;
    document.getElementById('enable').disabled = false;
  });
});

document.getElementById('enable').addEventListener('click', e => {
  chrome.storage.local.get({
    exceptions: []
  }, prefs => {
    const {hostname} = new URL(tab.url);
    const n = prefs.exceptions.indexOf(hostname);
    prefs.exceptions.splice(n, 1);
    chrome.storage.local.set(prefs);
    // just in case js is not injected
    chrome.action.setIcon({
      tabId: tab.id,
      path: {
        16: '/data/icons/16.png',
        32: '/data/icons/32.png'
      }
    });

    e.target.disabled = true;
    document.getElementById('disable').disabled = false;
  });
});

document.getElementById('shortcuts').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq5'
}));
