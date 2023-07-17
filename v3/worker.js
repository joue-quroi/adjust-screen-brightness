const range = async () => {
  const prefs = await new Promise(resolve => chrome.storage.local.get({
    'day-time': '08:00',
    'night-time': '19:00',
    'day-range': 0.1,
    'night-range': 0.2
  }, resolve));
  const day = prefs['day-time'].split(':').map((s, i) => s * (i === 0 ? 60 : 1)).reduce((p, c) => p + c, 0);
  let night = prefs['night-time'].split(':').map((s, i) => s * (i === 0 ? 60 : 1)).reduce((p, c) => p + c, 0);

  if (night === day) {
    return {
      pref: 'night-range',
      level: prefs['night-range']
    };
  }

  if (night <= day) {
    night += 24 * 60;
  }
  const d = new Date();
  const now = d.getMinutes() + d.getHours() * 60;

  if (now >= day && now < night) {
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
  const o = await range();
  if (update.log) {
    console.log('update', reason, o);
  }
  chrome.storage.local.set({
    level: o.level,
    pref: o.pref
  });
}

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

function state(enabled) {
  chrome.action.setIcon({
    path: {
      '16': '/data/icons/' + (enabled ? '' : 'disabled/') + '16.png',
      '32': '/data/icons/' + (enabled ? '' : 'disabled/') + '32.png'
    }
  });
  chrome.action.setTitle({
    title: enabled ? 'Extension is enabled' : 'Extension is globally disabled'
  });
}

{
  const startup = () => {
    chrome.storage.local.get({
      'day-time': '08:00',
      'night-time': '19:00',
      'enabled': true
    }, prefs => {
      setAlartm('day-time', prefs['day-time']);
      setAlartm('night-time', prefs['night-time']);
      update('start.up');

      state(prefs.enabled);
    });
  };
  chrome.runtime.onStartup.addListener(startup);
  chrome.runtime.onInstalled.addListener(startup);
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
  if (ps['enabled']) {
    state(ps.enabled.newValue);
  }
});

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'icon') {
    chrome.action.setIcon({
      tabId: sender.tab.id,
      path: {
        16: '/data/icons/' + (request.excepted ? 'disabled/' : '') + '16.png',
        32: '/data/icons/' + (request.excepted ? 'disabled/' : '') + '32.png'
      }
    });
    chrome.action.setTitle({
      tabId: sender.tab.id,
      title: (request.excepted ? 'Brightness control is disabled on this hostname' : chrome.runtime.getManifest().name)
    });
  }
  else if (request.method === 'range') {
    range().then(response);
    return true;
  }
});

chrome.commands.onCommand.addListener(async command => {
  if (command === 'enabled') {
    chrome.storage.local.get({
      enabled: true
    }, prefs => chrome.storage.local.set({
      enabled: !prefs.enabled
    }));
  }
  else {
    const {pref, level} = await range();
    const v = Math.max(0, Math.min(1.2, level + (command === 'increase' ? -0.05 : +0.05)));

    chrome.storage.local.set({
      [pref]: v
    });
  }
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
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
