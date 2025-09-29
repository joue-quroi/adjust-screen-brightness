/* this script is inspired from popup-blocker (strict) extension */

const activate = async () => {
  if (activate.busy) {
    return;
  }
  activate.busy = true;

  const prefs = await chrome.storage.local.get({
    'enabled': true,
    'scope': [],
    'top-hosts': [] // this is not yet used in this extension
  });
  try {
    await chrome.scripting.unregisterContentScripts();

    if (prefs.enabled) {
      // exception list
      const th = [];
      for (const hostname of prefs['top-hosts']) {
        try {
          await activate.test('*://' + hostname + '/*');
          th.push('*://' + hostname + '/*');
        }
        catch (e) {
          console.warn('Cannot use ' + hostname + ' rule. Reason: ' + e.message);
        }
        try {
          await activate.test('*://*.' + hostname + '/*');
          th.push('*://*.' + hostname + '/*');
        }
        catch (e) {
          console.warn('Cannot use *.' + hostname + ' rule. Reason: ' + e.message);
        }
      }

      if (prefs.scope.length === 0) {
        prefs.scope.push('<all_urls>');
      }

      await chrome.scripting.registerContentScripts([{
        'id': 'isolated',
        'js': ['/data/inject.js'],
        'world': 'ISOLATED',
        'matches': prefs.scope,
        'excludeMatches': th,
        'runAt': 'document_start'
      }]);
    }
  }
  catch (e) {
    chrome.action.setBadgeBackgroundColor({color: '#b16464'});
    chrome.action.setBadgeText({text: 'E'});
    chrome.action.setTitle({title: e.message});
    console.error('Registration Failed', e);
  }
  activate.busy = false;
};
activate.test = async pattern => {
  await chrome.scripting.registerContentScripts([{
    'id': 'test',
    'js': ['/data/test.js'],
    'world': 'MAIN',
    'matches': ['*://*/*'],
    'excludeMatches': [pattern]
  }]);
  await chrome.scripting.unregisterContentScripts({
    ids: ['test']
  }).catch(() => {});
};
chrome.runtime.onStartup.addListener(activate);
chrome.runtime.onInstalled.addListener(activate);
chrome.storage.onChanged.addListener(ps => {
  if (ps['top-hosts'] || ps.scope || ps.enabled) {
    activate();
  }
});
