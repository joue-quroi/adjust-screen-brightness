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
// https://thesilphroad.com/

{
  let excepted = false;
  let isDarkMode = false;

  const css = (level, type) => {
    if (level === 0 || excepted || isDarkMode) {
      return '';
    }

    if ((type === 'adaptive' && level > 0) || type === 'rgba') {
      return `html::before {
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

    chrome.runtime.sendMessage({
      method: 'icon',
      enabled: prefs.enabled,
      excepted,
      isDarkMode
    });
  });

  chrome.storage.local.get({
    'exceptions': []
  }, prefs => {
    excepted = prefs.exceptions.includes(location.hostname);
    if (excepted) {
      chrome.runtime.sendMessage({
        method: 'icon',
        excepted
      });
    }
    cc();
  });

  const darkmode = (dispatch = false) => chrome.storage.local.get({
    'disable-if-dark-mode': true,
    'dark-mode-exceptions': []
  }, prefs => {
    if (prefs['disable-if-dark-mode'] === false) {
      return;
    }
    if (prefs['dark-mode-exceptions'].includes(location.hostname)) {
      return;
    }

    const span = document.createElement('span');
    span.style = 'position: fixed; top: 0, left: 0';
    document.body.append(span);
    const color = getComputedStyle(span).getPropertyValue('color');
    span.remove();

    // color
    const match = color.match(/\d+/g); // Get digits from the string
    if (!match || match.length < 3) {
      return null; // Handle invalid color format
    }

    // Convert each channel to 8-bit int and combine
    const rgb = [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
    const brightness = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;

    isDarkMode = brightness > 0.5;

    if (isDarkMode || dispatch) {
      cc();
    }
  });


  chrome.storage.onChanged.addListener(ps => {
    if (ps.exceptions) {
      excepted = ps.exceptions.newValue.indexOf(location.hostname) !== -1;

      if (excepted) {
        style.textContent = css(0);
        chrome.runtime.sendMessage({
          method: 'icon',
          excepted
        });
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
      chrome.runtime.sendMessage({
        method: 'icon',
        enabled: ps.enabled.newValue,
        excepted
      });
    }
    if (ps['dark-mode-exceptions']) {
      if (ps['dark-mode-exceptions'].newValue.includes(location.hostname)) {
        isDarkMode = false;
        cc();
      }
      else {
        darkmode(true);
      }
    }
    if (ps.hostnames || ps.level || ps['styling-method']) {
      cc();
    }
  });
  // is dark mode
  document.addEventListener('DOMContentLoaded', () => {
    darkmode();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => darkmode(true));
  });
}


