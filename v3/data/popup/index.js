'use strict';

let tab;
let hostname;

const save = (prefs, isTrusted = true) => {
  if (isTrusted) {
    chrome.storage.local.set(prefs);
  }
};

const change = target => {
  const dx = target.valueAsNumber - target.ov;

  const aid = target.id === 'day-range' ? 'night-range' : 'day-range';
  const ea = document.getElementById(aid);
  ea.valueAsNumber += dx;
  ea.dispatchEvent(new Event('input', {
    bubbles: true
  }));
};

document.addEventListener('input', e => {
  const {target} = e;

  if (target.id.endsWith('-range')) {
    target.parentNode.querySelector('span').textContent = parseInt(target.value * 100) + '%';

    if (e.isTrusted && document.body.dataset.locked === 'true') {
      change(target);
    }

    target.ov = target.valueAsNumber;
  }
});

const event = () => {
  document.getElementById('day-range').dispatchEvent(new Event('input', {
    bubbles: true
  }));
  document.getElementById('night-range').dispatchEvent(new Event('input', {
    bubbles: true
  }));
};

document.addEventListener('input', e => {
  const {target} = e;
  const isTrusted = e.isTrusted || e.detail?.isTrusted || false;

  if (target.id.endsWith('-range') || (target.id === 'hostname' && target.checked)) {
    if (document.getElementById('hostname').checked) {
      chrome.storage.local.get({
        hostnames: {}
      }, prefs => {
        prefs.hostnames[hostname] = {
          'day-range': 1 - document.getElementById('day-range').value,
          'night-range': 1 - document.getElementById('night-range').value
        };
        save(prefs, isTrusted);
      });
    }
    else if (target.id.endsWith('-range')) {
      save({
        'day-range': 1 - document.getElementById('day-range').value,
        'night-range': 1 - document.getElementById('night-range').value
      }, isTrusted);
    }
    else {
      save({
        [target.id]: 1 - target.value
      }, isTrusted);
    }
  }
  else if (target.id === 'global' || target.id === 'hostname') {
    chrome.storage.local.get({
      'day-range': 0.1,
      'night-range': 0.2,
      'hostnames': {}
    }, prefs => {
      delete prefs.hostnames[hostname];
      save(prefs, isTrusted);
      document.getElementById('day-range').value = 1 - prefs['day-range'];
      document.getElementById('night-range').value = 1 - prefs['night-range'];
      event();
    });
  }
  else {
    save({
      [target.id]: target.value
    }, isTrusted);
  }
});

const update = (focus = true) => chrome.runtime.sendMessage({
  method: 'range'
}, range => {
  document.body.dataset.mode = range.pref;
  if (focus) {
    document.getElementById(range.pref).focus();
  }
});
chrome.storage.onChanged.addListener(ps => {
  if (ps['day-time'] || ps['night-time']) {
    update(false);
  }
});

chrome.storage.local.get({
  'day-time': '08:00',
  'night-time': '19:00',
  'day-range': 0.1,
  'night-range': 0.2,
  'enabled': true,
  'locked': false,
  'disable-if-dark-mode': false
}, prefs => {
  document.getElementById('day-time').value = prefs['day-time'];
  document.getElementById('night-time').value = prefs['night-time'];

  document.getElementById('day-range').ov =
  document.getElementById('day-range').value = 1 - prefs['day-range'];
  document.getElementById('night-range').ov =
  document.getElementById('night-range').value = 1 - prefs['night-range'];

  document.getElementById('lock').classList[prefs.locked ? 'add' : 'remove']('locked');
  document.body.dataset.locked = prefs['locked'];
  event();

  document.getElementById('switch').textContent = prefs.enabled ? 'Disable Everywhere' : 'Enable Everywhere';

  if (prefs['disable-if-dark-mode'] === false) {
    document.getElementById('dark-mode-list').classList.add('hidden');
  }

  update();

  chrome.tabs.query({
    currentWindow: true,
    active: true
  }, tabs => {
    tab = tabs[0];
    try {
      const o = new URL(tab.url);
      hostname = o.hostname;

      const dml = document.getElementById('dark-mode-list');
      dml.onclick = e => chrome.storage.local.get({
        'dark-mode-exceptions': []
      }, prefs => {
        if (e.target.textContent.includes('Exclude')) {
          prefs['dark-mode-exceptions'].push(hostname);
          prefs['dark-mode-exceptions'] = prefs['dark-mode-exceptions'].filter((s, i, l) => s && l.indexOf(s) === i);
        }
        else {
          prefs['dark-mode-exceptions'] = prefs['dark-mode-exceptions'].filter(s => s !== hostname);
        }

        chrome.storage.local.set({
          'dark-mode-exceptions': prefs['dark-mode-exceptions']
        }, darkmode);
      });
      const darkmode = () => chrome.storage.local.get({
        'dark-mode-exceptions': []
      }, prefs => {
        if (prefs['dark-mode-exceptions'].includes(hostname)) {
          dml.textContent = 'Include in Auto Dark Mode Detection';
        }
        else {
          dml.textContent = 'Exclude from Auto Dark Mode Detection';
        }
      });

      if (o.protocol === 'http:' || o.protocol === 'https:') {
        chrome.storage.local.get({
          'exceptions': [],
          'hostnames': {}
        }, prefs => {
          // exceptions
          if (prefs.exceptions.indexOf(hostname) === -1) {
            document.getElementById('disable').disabled = false;
          }
          else {
            document.getElementById('enable').disabled = false;
          }
          // dark mode
          darkmode();

          // hostnames
          if (prefs.hostnames[hostname]) {
            document.getElementById('hostname').checked = true;
            document.getElementById('day-range').value = 1 - prefs.hostnames[hostname]['day-range'];
            document.getElementById('night-range').value = 1 - prefs.hostnames[hostname]['night-range'];
            event();
          }
        });
      }
      else {
        document.getElementById('mode').classList.add('disabled');
        document.getElementById('dark-mode-list').disabled = true;
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
          }).then(() => {
            document.body.dataset.injected = true;
          }).catch(() => {});
        }
      });
    }
    catch (e) {}
  });
});


document.getElementById('disable').onclick = e => {
  chrome.storage.local.get({
    exceptions: []
  }, prefs => {
    const {hostname} = new URL(tab.url);
    prefs.exceptions.push(hostname);
    save(prefs, true);
    e.target.disabled = true;
    document.getElementById('enable').disabled = false;
  });
};

document.getElementById('enable').onclick = e => {
  chrome.storage.local.get({
    exceptions: []
  }, prefs => {
    const {hostname} = new URL(tab.url);
    const n = prefs.exceptions.indexOf(hostname);
    prefs.exceptions.splice(n, 1);
    save(prefs, true);
    e.target.disabled = true;
    document.getElementById('disable').disabled = false;
  });
};

document.getElementById('switch').onclick = () => {
  chrome.storage.local.get({
    enabled: true
  }, prefs => {
    save({
      enabled: !prefs.enabled
    }, true);
    document.getElementById('switch').textContent = prefs.enabled ? 'Enable Everywhere' : 'Disable Everywhere';
  });
};

document.getElementById('shortcuts').onclick = () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq5'
});

// adjust the brightness setting with the mouse scroll wheel
document.addEventListener('wheel', e => {
  let range;
  if (e.target.closest('.day')) {
    range = document.getElementById('day-range');
  }
  else if (e.target.closest('.night')) {
    range = document.getElementById('night-range');
  }

  if (range) {
    range.valueAsNumber += (e.deltaY < 0 ? 1 : -1) * 0.01;
    if (e.isTrusted) {
      change(range);
    }
    range.dispatchEvent(new CustomEvent('input', {
      bubbles: true,
      detail: {
        isTrusted: true
      }
    }));
  }
});

document.getElementById('lock').addEventListener('click', e => {
  e.target.classList.toggle('locked');
  const locked = e.target.classList.contains('locked');
  save({
    locked
  }, true);
  document.body.dataset.locked = locked;
});
