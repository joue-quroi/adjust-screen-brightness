/* globals webext */
'use strict';

webext.webNavigation.on('committed', ({tabId}) => {
  webext.tabs.executeScript(tabId, {
    runAt: 'document_start',
    code: `
      var prefs = {
        level: ${localStorage.getItem('level') || 0.1}
      };
    `
  }, () => webext.tabs.executeScript(tabId, {
    runAt: 'document_start',
    file: '/data/inject.js'
  }));
}).if(({frameId, url}) => frameId === 0 && (url.startsWith('http') || url.startsWith('file')));

function update(reason) {
  webext.storage.get({
    'day-time': '08:00',
    'night-time': '19:00',
    'day-range': 0.1,
    'night-range': 0.2
  }).then(prefs => {
    const day = prefs['day-time'].split(':').map((s, i) => s * (i === 0 ? 60 : 1)).reduce((p, c) => p + c, 0);
    let night = prefs['night-time'].split(':').map((s, i) => s * (i === 0 ? 60 : 1)).reduce((p, c) => p + c, 0);

    if (night <= day) {
      night += 24 * 60;
    }
    const d = new Date();
    const now = d.getMinutes() + d.getHours() * 60;

    if (now > day && now < night) {
      localStorage.setItem('level', prefs['day-range']);
    }
    else {
      localStorage.setItem('level', prefs['night-range']);
    }
    webext.storage.set({
      level: localStorage.getItem('level')
    });
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
