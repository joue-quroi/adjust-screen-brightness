/* globals prefs */
'use strict';

[...document.querySelectorAll('#global-dark-mode')].forEach(e => e.remove());

{
  const css = level => level !== '0.00' ? `html:before {
    content: " ";
    z-index: 100000000000000;
    pointer-events: none;
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, ${level});
  }` : '';

  const style = document.createElement('style');
  style.id = 'global-dark-mode';
  style.textContent = css(prefs.level);
  style.setAttribute('media', 'screen');
  document.documentElement.appendChild(style);

  chrome.storage.onChanged.addListener(ps => {
    if (ps.level) {
      style.textContent = css(ps.level.newValue);
    }
  });
}
