'use strict';

var css = `html:before {
  content: " ";
  z-index: 100000000000000;
  pointer-events: none;
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, level);
}`;

var style = document.createElement('style');
style.textContent = css.replace('level', prefs.level);
document.documentElement.appendChild(style);

chrome.storage.onChanged.addListener(ps => {
  if (ps.level) {
    style.textContent = css.replace('level', ps.level.newValue);
  }
});
