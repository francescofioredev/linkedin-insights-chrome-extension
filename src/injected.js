(() => {
    const LOG = "[LI applies][injected]";

    const dispatchResult = (payload) => {
        window.dispatchEvent(new CustomEvent("LI_DIRECT_RESULT", {detail: payload}));
    };

    function getCookie(name) {
        const all = document.cookie || "";
        const parts = all.split("; ");
        for (const part of parts) {
            const eq = part.indexOf("=");
            if (eq === -1) continue;
            const k = part.slice(0, eq);
            const v = part.slice(eq + 1);
            if (k === name) return decodeURIComponent(v);
        }
        return null;
    }

    function getCsrfTokenFromJSession() {
            console.warn(LOG, "Missing JSESSIONID cookie"); // warning log for missing cookie
            return null;
        }
        const token = raw.replace(/^"|"$/g, "");
        // console.debug(LOG, "Extracted CSRF:", token); // removed debug log
        return token;
    }

    async function fetchJobPosting(jobId, topN = 1) {
        const csrf = getCsrfTokenFromJSession();
        const url = `/voyager/api/jobs/jobPostings/${encodeURIComponent(jobId)}?topN=${encodeURIComponent(topN)}`;
        // console.log(LOG, "Fetching:", url); // removed debug log

        const res = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
                "csrf-token": csrf || "",
                "accept": "application/json",
                "x-restli-protocol-version": "2.0.0",
                "x-li-lang": navigator.language?.replace("-", "_") || "en_US"
            }
        });

        const status = res.status;
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error(LOG, "Fetch failed:", status, text.slice(0, 300)); // removed debug log
            throw Object.assign(new Error(`HTTP ${status}`), {status, csrfPresent: !!csrf});
        }
        const data = await res.json();
        // console.debug(LOG, "Fetch success, snippet:", JSON.stringify(data).slice(0, 200)); // removed debug log
        return {data, status, csrfPresent: !!csrf};
    }

    window.addEventListener("LI_DIRECT_FETCH", async (ev) => {
        const {jobId, topN} = ev.detail || {};
        if (!jobId) {
            dispatchResult({ok: false, error: "Missing jobId", status: 0, csrfPresent: !!getCsrfTokenFromJSession()});
            return;
        }
        try {
            const {data, status, csrfPresent} = await fetchJobPosting(jobId, topN ?? 1);
            dispatchResult({ok: true, data, status, csrfPresent});
        } catch (err) {
            dispatchResult({ok: false, error: String(err?.message || err), status: err?.status || 0, csrfPresent: !!getCsrfTokenFromJSession()});
        }
    });
})();
