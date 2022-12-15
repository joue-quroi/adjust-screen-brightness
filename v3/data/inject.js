'use strict';

[...document.querySelectorAll('.adjust-screen-brightness')].forEach(e => e.remove());

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'ping') {
    response('pong');
  }
});

// https://vimeo.com/275870896 -> Fullscreen
// https://classroom.google.com/h
// https://drive.google.com/drive/my-drive
// https://kirkmcdonald.github.io/calc.html#data=1-1-19&items=advanced-circuit:f:1

{
  let excepted = false;

  const css = (level, type) => {
    if (level === 0 || excepted) {
      return '';
    }

    if ((type === 'adaptive' && level > 0) || type === 'rgba') {
      return `html:after {
  content: " ";
  z-index: 2147483647;
  pointer-events: none;
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, ${level});
}`;
    }
    else {
      return `html {
  filter: brightness(${1 - level}) !important;
}`;
    }
  };

  const style = document.createElement('style');
  style.classList.add('adjust-screen-brightness');
  style.textContent = '';
  style.setAttribute('media', 'screen');
  document.documentElement.appendChild(style);


  const cc = () => chrome.storage.local.get({
    'level': 0.1,
    'hostnames': {},
    'pref': 'day-range',
    'enabled': true,
    'styling-method': 'adaptive' // adaptive, rgba, filter
  }, prefs => {
    if (prefs.hostnames[location.hostname]) {
      style.textContent = css(prefs.hostnames[location.hostname][prefs.pref], prefs['styling-method']);
    }
    else {
      style.textContent = css(prefs.level, prefs['styling-method']);
    }
    style.disabled = prefs.enabled === false;
  });

  chrome.storage.local.get({
    'exceptions': []
  }, prefs => {
    excepted = prefs.exceptions.indexOf(location.hostname) !== -1;
    if (excepted) {
      chrome.runtime.sendMessage({
        method: 'icon',
        excepted
      });
    }
    cc();
  });

  chrome.storage.onChanged.addListener(ps => {
    if (ps.exceptions) {
      excepted = ps.exceptions.newValue.indexOf(location.hostname) !== -1;

      if (excepted) {
        style.textContent = css(0);
      }
      else {
        cc();
      }
      chrome.runtime.sendMessage({
        method: 'icon',
        excepted
      });
    }
    if (ps.enabled) {
      style.disabled = ps.enabled.newValue === false;
    }
    if (ps.hostnames || ps.level || ps['styling-method']) {
      cc();
    }
  });
}
