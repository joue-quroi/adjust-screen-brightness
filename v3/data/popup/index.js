'use strict';

let tab;
let hostname;

document.addEventListener('input', ({target}) => {
  if (target.id.indexOf('-range') !== -1) {
    target.parentNode.querySelector('span').textContent = parseInt(target.value * 100) + '%';
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
  const {target, isTrusted} = e;

  const save = prefs => isTrusted && chrome.storage.local.set(prefs);

  if (target.id.indexOf('-range') !== -1 || (target.id === 'hostname' && target.checked)) {
    if (document.getElementById('hostname').checked) {
      chrome.storage.local.get({
        hostnames: {}
      }, prefs => {
        prefs.hostnames[hostname] = {
          'day-range': 1 - document.getElementById('day-range').value,
          'night-range': 1 - document.getElementById('night-range').value
        };
        save(prefs);
      });
    }
    else {
      save({
        [target.id]: 1 - target.value
      });
    }
  }
  else if (target.id === 'global' || target.id === 'hostname') {
    chrome.storage.local.get({
      'day-range': 0.1,
      'night-range': 0.2,
      'hostnames': {}
    }, prefs => {
      delete prefs.hostnames[hostname];
      save(prefs);
      document.getElementById('day-range').value = 1 - prefs['day-range'];
      document.getElementById('night-range').value = 1 - prefs['night-range'];
      event();
    });
  }
  else {
    save({
      [target.id]: target.value
    });
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
  'enabled': true
}, prefs => {
  document.getElementById('day-time').value = prefs['day-time'];
  document.getElementById('night-time').value = prefs['night-time'];
  document.getElementById('day-range').value = 1 - prefs['day-range'];
  document.getElementById('night-range').value = 1 - prefs['night-range'];
  event();

  document.getElementById('switch').value = prefs.enabled ? 'Disable Everywhere' : 'Enable Everywhere';

  update();

  chrome.tabs.query({
    currentWindow: true,
    active: true
  }, tabs => {
    tab = tabs[0];
    try {
      const o = new URL(tab.url);
      hostname = o.hostname;

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


document.getElementById('switch').addEventListener('click', () => {
  chrome.storage.local.get({
    enabled: true
  }, prefs => {
    chrome.storage.local.set({
      enabled: !prefs.enabled
    });
    document.getElementById('switch').value = prefs.enabled ? 'Enable Everywhere' : 'Disable Everywhere';
  });
});

document.getElementById('shortcuts').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq5'
}));

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
    range.dispatchEvent(new Event('input', {
      bubbles: true
    }));
  }
});
