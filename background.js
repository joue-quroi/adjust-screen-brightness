'use strict';

window.icon = (tabId, active = true, message) => {
  chrome.browserAction.setIcon({
    tabId,
    path: {
      16: '/data/icons/' + (active ? '' : 'disabled/') + '16.png',
      32: '/data/icons/' + (active ? '' : 'disabled/') + '32.png'
    }
  });
  chrome.browserAction.setTitle({
    tabId,
    title: message || (active ? chrome.runtime.getManifest().name : 'Disabled on this hostname')
  });
};
window.reset = tab => {
  chrome.tabs.executeScript(tab.id, {
    code: `[...document.querySelectorAll('#global-dark-mode')].forEach(e => e.remove());`
  }, () => chrome.runtime.lastError);
  window.icon(tab.id, false);
};
const onCommitted = ({tabId, frameId, url}) => {
  if (frameId === 0) {
    const list = JSON.parse(localStorage.getItem('exceptions') || '[]');
    if (list.some(h => url.startsWith('http://' + h + '/') || url.startsWith('https://' + h + '/'))) {
      window.icon(tabId, false);
      return;
    }
    chrome.tabs.executeScript(tabId, {
      runAt: 'document_start',
      code: `
        var prefs = {
          level: '${localStorage.getItem('level') || '0.10'}'
        };
      `
    }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        window.icon(tabId, false, lastError.message);
      }
      else {
        chrome.tabs.executeScript(tabId, {
          runAt: 'document_start',
          file: '/data/inject.js'
        });
      }
    });
  }
};
window.onCommitted = onCommitted;
chrome.webNavigation.onCommitted.addListener(onCommitted, {
  url: [{
    schemes: ['http', 'https', 'file']
  }]
});

{
  const startup = () => {
    chrome.tabs.query({
      url: '*://*/*'
    }, tabs => tabs.forEach(tab => onCommitted({
      frameId: 0,
      tabId: tab.id,
      url: tab.url
    })));
    chrome.storage.local.get({
      'day-time': '08:00',
      'night-time': '19:00'
    }, prefs => {
      setAlartm('day-time', prefs['day-time']);
      setAlartm('night-time', prefs['night-time']);
      update('start.up');
    });
  };
  chrome.runtime.onStartup.addListener(startup);
  chrome.runtime.onInstalled.addListener(startup);
}

const range = async () => {
  const prefs = await new Promise(resolve => chrome.storage.local.get({
    'day-time': '08:00',
    'night-time': '19:00',
    'day-range': 0.1,
    'night-range': 0.2
  }, resolve));
  const day = prefs['day-time'].split(':').map((s, i) => s * (i === 0 ? 60 : 1)).reduce((p, c) => p + c, 0);
  let night = prefs['night-time'].split(':').map((s, i) => s * (i === 0 ? 60 : 1)).reduce((p, c) => p + c, 0);

  if (night <= day) {
    night += 24 * 60;
  }
  const d = new Date();
  const now = d.getMinutes() + d.getHours() * 60;

  if (now > day && now < night) {
    return {
      pref: 'day-range',
      level: prefs['day-range']
    };
  }
  return {
    pref: 'night-range',
    level: prefs['night-range']
  };
};

async function update(reason) {
  // console.log('update', reason);
  const {level} = await range();
  localStorage.setItem('level', level.toFixed(2));
  chrome.storage.local.set({
    level: localStorage.getItem('level')
  });
}
chrome.alarms.onAlarm.addListener(({name}) => {
  update('alarm.' + name);
});
chrome.idle.onStateChanged.addListener(state => {
  if (state === 'active') {
    update('idle.active');
  }
});

/* change */
chrome.storage.onChanged.addListener(ps => {
  if (ps['night-range'] || ps['day-range'] || ps['night-time'] || ps['day-time']) {
    update('prefs.changed');
  }
  if (ps['day-time']) {
    setAlartm('day-time', ps['day-time'].newValue);
  }
  if (ps['night-time']) {
    setAlartm('night-time', ps['night-time'].newValue);
  }
});

function setAlartm(id, val) {
  val = val.split(':');
  const d = new Date();
  d.setSeconds(0);
  d.setHours(val[0]);
  d.setMinutes(val[1]);

  const now = Date.now();
  const when = d.getTime();
  chrome.alarms.create(id, {
    when: when <= now ? when + 24 * 60 * 60 * 1000 : when,
    periodInMinutes: 24 * 60
  });
}

chrome.commands.onCommand.addListener(async command => {
  const {pref, level} = await range();
  const v = Math.max(0, Math.min(1, level + (command === 'increase' ? -0.05 : +0.05)));

  chrome.storage.local.set({
    [pref]: v
  });
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
