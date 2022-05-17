'use strict';

[...document.querySelectorAll('.adjust-screen-brightness')].forEach(e => e.remove());

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'ping') {
    response('pong');
  }
});

{
  let excepted = false;

  const css = level => level !== '0.00' && excepted === false ? `html:before {
    content: " ";
    z-index: 2147483647;
    pointer-events: none;
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, ${level});
  }` : '';

  const style = document.createElement('style');
  style.classList.add('adjust-screen-brightness');
  style.textContent = '';
  style.setAttribute('media', 'screen');
  document.documentElement.appendChild(style);


  const cc = () => chrome.storage.local.get({
    'level': 0.1,
    'hostnames': {},
    'pref': 'day-range',
    'enabled': true
  }, prefs => {
    if (prefs.hostnames[location.hostname]) {
      style.textContent = css(prefs.hostnames[location.hostname][prefs.pref]);
    }
    else {
      style.textContent = css(prefs.level);
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
    if (ps.level) {
      cc();
    }
    if (ps.enabled) {
      style.disabled = ps.enabled.newValue === false;
    }
    if (ps.hostnames) {
      cc();
    }
  });
}
