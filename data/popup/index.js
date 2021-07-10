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
  tab = tabs[0];
  const {hostname, protocol} = new URL(tab.url);
  if (protocol === 'http:' || protocol === 'https:') {
    const list = JSON.parse(localStorage.getItem('exceptions') || '[]');
    if (list.indexOf(hostname) === -1) {
      document.getElementById('disable').disabled = false;
    }
    else {
      document.getElementById('enable').disabled = false;
    }
  }
});

document.getElementById('disable').addEventListener('click', e => {
  const list = JSON.parse(localStorage.getItem('exceptions') || '[]');
  const {hostname} = new URL(tab.url);
  list.push(hostname);
  localStorage.setItem('exceptions', JSON.stringify(list));
  e.target.disabled = true;
  document.getElementById('enable').disabled = false;
  chrome.runtime.getBackgroundPage(bg => {
    chrome.tabs.query({}, tabs => {
      tabs = tabs.filter(t => t.url && (t.url.startsWith('http://' + hostname) || t.url.startsWith('https://' + hostname)));
      for (const tab of tabs) {
        bg.reset(tab);
      }
    });
  });
});

document.getElementById('enable').addEventListener('click', e => {
  const list = JSON.parse(localStorage.getItem('exceptions') || '[]');
  const {hostname} = new URL(tab.url);
  const index = list.indexOf(hostname);
  list.splice(index, 1);
  localStorage.setItem('exceptions', JSON.stringify(list));
  e.target.disabled = true;
  document.getElementById('disable').disabled = false;
  chrome.runtime.getBackgroundPage(bg => {
    chrome.tabs.query({}, tabs => {
      tabs = tabs.filter(t => t.url && (t.url.startsWith('http://' + hostname) || t.url.startsWith('https://' + hostname)));
      for (const tab of tabs) {
        bg.icon(tab.id, true);
        bg.onCommitted({
          frameId: 0,
          tabId: tab.id,
          url: tab.url
        });
      }
    });
  });
});

document.getElementById('shortcuts').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq5'
}));
