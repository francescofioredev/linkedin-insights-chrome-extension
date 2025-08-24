(() => {
    "use strict";
    const LOG = "[LI applies][content]";

    // Inject the in-page script (once)
    (function injectOnce() {
        if (document.documentElement.dataset.liAppliesInjected === "1") return;
        const s = document.createElement("script");
        s.src = chrome.runtime.getURL("injected.js");
        s.async = false;
        s.onload = () => s.remove();
        (document.head || document.documentElement).appendChild(s);
        document.documentElement.dataset.liAppliesInjected = "1";
    })();

    // Helpers to identify the jobId
    function getJobIdFromQuery() {
        try {
            return new URL(location.href).searchParams.get("currentJobId");
        } catch {
            return null;
        }
    }

    function getJobIdFromPath() {
        const m = location.pathname.match(/\/jobs\/view\/(\d+)/i);
        return m ? m[1] : null;
    }

    function getJobIdFromDom() {
        const byData = document.querySelector("[data-job-id]");
        if (byData) {
            const v = byData.getAttribute("data-job-id");
            if (v && /^\d+$/.test(v)) return v;
        }
        const byUrn = document.querySelector('[data-entity-urn*="urn:li:jobPosting:"]');
        if (byUrn) {
            const urn = byUrn.getAttribute("data-entity-urn") || "";
            const m = urn.match(/urn:li:jobPosting:(\d+)/);
            if (m) return m[1];
        }
        const a = document.querySelector('a[href*="/jobs/view/"]');
        if (a) {
            const m = a.getAttribute("href")?.match(/\/jobs\/view\/(\d+)/);
            if (m) return m[1];
        }
        return null;
    }

    function getCurrentJobId() {
        return getJobIdFromQuery() || getJobIdFromPath() || getJobIdFromDom();
    }

    // Request to injected.js + response to popup
    function fetchJobData(jobId, sendResponse) {
        const timeoutMs = 12000;
        let done = false;

        const handleResult = (ev) => {
            if (done) return;
            const {ok, error, data, status, csrfPresent} = ev.detail || {};
            done = true;
            window.removeEventListener("LI_DIRECT_RESULT", handleResult);
            if (!ok) {
                console.warn(LOG, "Fetch failed:", error);
                sendResponse({ok: false, error, status, csrfPresent, jobId});
            } else {
                sendResponse({ok: true, data, status, csrfPresent, jobId});
            }
        };

        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            window.removeEventListener("LI_DIRECT_RESULT", handleResult);
            console.warn(LOG, "Timeout waiting job data");
            sendResponse({ok: false, error: "Timeout", status: 0, csrfPresent: null, jobId});
        }, timeoutMs);

        window.addEventListener("LI_DIRECT_RESULT", (ev) => {
            clearTimeout(timer);
            handleResult(ev);
        }, {once: true});

        window.dispatchEvent(new CustomEvent("LI_DIRECT_FETCH", {detail: {jobId, topN: 1}}));
    }

    // Listener for requests from popup
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type !== "GET_JOB_DETAILS") return; // ignore other messages

        if (!location.pathname.startsWith("/jobs/")) {
            sendResponse({ok: false, error: "Not a /jobs/ page"});
            return true;
        }

        const jobId = getCurrentJobId();
        if (!jobId) {
            sendResponse({ok: false, error: "No jobId on this page"});
            return true;
        }

        fetchJobData(jobId, sendResponse);
        return true; // keep the message channel open (async response)
    });
})();

// Ping the background script (once, and on URL changes in SPA)
(function pingBG() {
    if (location.pathname.startsWith("/jobs/")) {
        chrome.runtime.sendMessage({type: "JOBS_CONTEXT_PING"});
    }
    // re-fire the ping when the URL changes in the SPA
    const fire = () => chrome.runtime.sendMessage({type: "JOBS_CONTEXT_PING"});
    const p = history.pushState, r = history.replaceState;
    history.pushState = function (...a) {
        const ret = p.apply(this, a);
        fire();
        return ret;
    };
    history.replaceState = function (...a) {
        const ret = r.apply(this, a);
        fire();
        return ret;
    };
    window.addEventListener("popstate", fire);
})();
