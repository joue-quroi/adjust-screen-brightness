'use strict';

const toast = document.getElementById('toast');

const notify = (message, out = 750) => {
  toast.textContent = message;

  clearTimeout(notify.id);
  notify.id = setTimeout(() => toast.textContent = '', out);
};

const init = () => chrome.storage.local.get({
  'exceptions': [],
  'styling-method': 'adaptive',
  'disable-if-dark-mode': false,
  'dark-mode-exceptions': [],
  'fullscreen': true,
  'backdrop': false,
  'user-styles': '',
  'scope': []
}, prefs => {
  document.getElementById('exceptions').value = prefs.exceptions.join(', ');
  document.getElementById('styling-method').value = prefs['styling-method'];
  document.getElementById('disable-if-dark-mode').checked = prefs['disable-if-dark-mode'];
  document.getElementById('dark-mode-exceptions').value = prefs['dark-mode-exceptions'].join(', ');
  document.getElementById('fullscreen').checked = prefs['fullscreen'];
  document.getElementById('backdrop').checked = prefs['backdrop'];
  document.getElementById('user-styles').value = prefs['user-styles'];
  document.getElementById('scope').value = prefs['scope'].join(', ');
});
document.addEventListener('DOMContentLoaded', init);

document.getElementById('save').addEventListener('click', async () => {
  const scope = [];
  const patterns = document.getElementById('scope').value.split(/\s*,\s*/).filter((s, i, l) => {
    return s && l.indexOf(s) === i;
  });

  const msgs = [];
  for (const pattern of patterns) {
    try {
      await chrome.scripting.registerContentScripts([{
        'id': 'test',
        'js': ['/data/test.js'],
        'world': 'MAIN',
        'matches': [pattern]
      }]);
      scope.push(pattern);
    }
    catch (e) {
      console.error('[Invalid Pattern for Scope]', pattern, e);

      msgs.push('[Invalid Pattern for Scope] ' + pattern + ' -> ' + e.message);
    }
    await chrome.scripting.unregisterContentScripts({
      ids: ['test']
    }).catch(() => {});
  }

  await chrome.storage.local.set({
    'styling-method': document.getElementById('styling-method').value,
    'exceptions': document.getElementById('exceptions').value.split(/\s*,\s*/).filter((s, i, l) => {
      return s && l.indexOf(s) === i;
    }),
    'disable-if-dark-mode': document.getElementById('disable-if-dark-mode').checked,
    'dark-mode-exceptions': document.getElementById('dark-mode-exceptions').value.split(/\s*,\s*/).filter((s, i, l) => {
      return s && l.indexOf(s) === i;
    }),
    'fullscreen': document.getElementById('fullscreen').checked,
    'backdrop': document.getElementById('backdrop').checked,
    'user-styles': document.getElementById('user-styles').value,
    scope
  });

  init();

  if (msgs.length) {
    notify('Options saved!\n\n' + msgs.join('\n'), 30000);
  }
  else {
    notify('Options saved!');
  }
});


// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    notify('Double-click to reset!');
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
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

// github
document.getElementById('github').addEventListener('click', () => chrome.tabs.create({
  url: 'https://github.com/joue-quroi/adjust-screen-brightness/'
}));

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
