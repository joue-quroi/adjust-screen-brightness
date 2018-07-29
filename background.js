/* globals webext */
'use strict';

var onCommitted = ({tabId}) => {
  webext.tabs.executeScript(tabId, {
    runAt: 'document_start',
    code: `
      var prefs = {
        level: '${localStorage.getItem('level') || '0.10'}'
      };
    `
  }, () => webext.tabs.executeScript(tabId, {
    runAt: 'document_start',
    file: '/data/inject.js'
  }));
};
webext.webNavigation.on('committed', onCommitted)
  .if(({frameId, url}) => frameId === 0 && (url.startsWith('http') || url.startsWith('file')));

webext.runtime.on('start-up', () => chrome.tabs.query({
  url: '*://*/*'
}, tabs => tabs.forEach(tab => onCommitted({
  tabId: tab.id
}))));

var range = async() => {
  const prefs = await webext.storage.get({
    'day-time': '08:00',
    'night-time': '19:00',
    'day-range': 0.1,
    'night-range': 0.2
  });
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

async function update() {
  const {level} = await range();
  localStorage.setItem('level', level.toFixed(2));
  webext.storage.set({
    level: localStorage.getItem('level')
  });
}

webext.storage.on('changed', () => update('prefs.changed'))
  .if(ps => ps['night-range'] || ps['day-range'] || ps['night-time'] || ps['day-time']);

function setAlartm(id, val) {
  val = val.split(':');
  const d = new Date();
  d.setSeconds(0);
  d.setHours(val[0]);
  d.setMinutes(val[1]);

  const now = Date.now();
  const when = d.getTime();
  webext.alarms.create(id, {
    when: when <= now ? when + 24 * 60 * 60 * 1000 : when,
    periodInMinutes: 24 * 60
  });
}

chrome.commands.onCommand.addListener(async command => {
  const {pref, level} = await range();
  webext.storage.set({
    [pref]: Math.max(0, Math.min(1, level + (command === 'increase' ? -0.05 : +0.05)))
  });
});

webext.storage.on('changed', ps => {
  setAlartm('day-time', ps['day-time'].newValue);
}).if(ps => ps['day-time']);

webext.storage.on('changed', ps => {
  setAlartm('night-time', ps['night-time'].newValue);
}).if(ps => ps['night-time']);

webext.runtime.on('start-up', () => webext.storage.get({
  'day-time': '08:00',
  'night-time': '19:00'
}).then(prefs => {
  setAlartm('day-time', prefs['day-time']);
  setAlartm('night-time', prefs['night-time']);
  update('start.up');
}));

webext.alarms.on('alarm', ({name}) => update('alarm.' + name));
webext.idle.on('changed', () => update('idle.active')).if(state => state === 'active');

// FAQs and Feedback
webext.runtime.on('start-up', () => {
  const {name, version, homepage_url} = webext.runtime.getManifest(); // eslint-disable-line camelcase
  const page = homepage_url; // eslint-disable-line camelcase
  // FAQs
  webext.storage.get({
    'version': null,
    'faqs': true,
    'last-update': 0
  }).then(prefs => {
    if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
      const now = Date.now();
      const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
      webext.storage.set({
        version,
        'last-update': doUpdate ? Date.now() : prefs['last-update']
      }).then(() => {
        // do not display the FAQs page if last-update occurred less than 30 days ago.
        if (doUpdate) {
          const p = Boolean(prefs.version);
          webext.tabs.create({
            url: page + '&version=' + version +
              '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
            active: p === false
          });
        }
      });
    }
  });
  // Feedback
  webext.runtime.setUninstallURL(
    page + '&rd=feedback&name=' + name + '&version=' + version
  );
});
