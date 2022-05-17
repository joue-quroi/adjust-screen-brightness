'use strict';

const toast = document.getElementById('toast');

const init = () => chrome.storage.local.get({
  'exceptions': [],
  'styling-method': 'filter'
}, prefs => {
  document.getElementById('exceptions').value = prefs.exceptions.join(', ');
  document.getElementById('styling-method').value = prefs['styling-method'];
});
document.addEventListener('DOMContentLoaded', init);

document.getElementById('save').addEventListener('click', () => chrome.storage.local.set({
  'styling-method': document.getElementById('styling-method').value,
  'exceptions': document.getElementById('exceptions').value.split(/\s*,\s*/).filter((s, i, l) => {
    return s && l.indexOf(s) === i;
  })
}, () => {
  init();
  toast.textContent = 'Options saved!';
  window.setTimeout(() => toast.textContent = '', 750);
}));

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '&rd=donate'
}));

// github
document.getElementById('github').addEventListener('click', () => chrome.tabs.create({
  url: 'https://github.com/joue-quroi/adjust-screen-brightness/'
}));
