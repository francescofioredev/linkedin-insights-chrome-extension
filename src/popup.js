(() => {
    "use strict";
    const LOG = "[LI applies][popup]";

    // ---- MAPPING TABLES (extendable) ----
    const WORKPLACE_TYPE_MAP = {
        "1": "On-site",
        "2": "Remote",
        "3": "Hybrid"
    };

    const $ = (id) => document.getElementById(id);
    const set = (id, v) => {
        const el = $(id);
        if (el) el.textContent = v ?? "—";
    };
    const show = (id, on = true) => {
        const el = $(id);
        if (el) el.classList.toggle("hide", !on);
    };

    function setStatus(msg, ok = true) {
        const el = $("status");
        el.textContent = msg;
        el.classList.toggle("ok", ok);
        el.classList.toggle("err", !ok);
    }

    function fmtCurrency(n, currency = "EUR", locale = navigator.language || "en-US") {
        if (n == null || !isFinite(n)) return null;
        try {
            return new Intl.NumberFormat(locale, {style: "currency", currency, maximumFractionDigits: 0}).format(n);
        } catch {
            return `${n} ${currency}`;
        }
    }

    function fmtPct(n) {
        if (n == null || !isFinite(n)) return null;
        try {
            return new Intl.NumberFormat(navigator.language || "en-US", {style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 1}).format(n);
        } catch {
            return `${(n * 100).toFixed(1)}%`;
        }
    }

    function toDate(d) {
        if (!d && d !== 0) return null;
        try {
            const ms = typeof d === "number" ? (d > 1e12 ? d : d * 1000) : Date.parse(d);
            const t = new Date(ms);
            return isNaN(t) ? null : t;
        } catch {
            return null;
        }
    }

    function fmtDate(d) {
        const dt = toDate(d);
        if (!dt) return null;
        try {
            return new Intl.DateTimeFormat(navigator.language || "en-US", {dateStyle: "medium"}).format(dt);
        } catch {
            return dt.toISOString().slice(0, 10);
        }
    }

    // ---- NORMALIZERS ----
    function lastUrnToken(urn) {
        if (typeof urn !== "string") return null;
        // takes the last token after the colon (also handles enm-xxx)
        const m = urn.match(/:([a-z0-9_-]+)$/i);
        return m ? m[1] : null;
    }

    function humanizeToken(token) {
        if (!token) return null;
        if (/^\d+$/.test(token)) return token; // number → keep the number (will be used as dict key)
        return token.replace(/^enm-/, "").replace(/-/g, " ");
    }

    function mapWorkplaceTypes(list, remoteAllowed) {
        if (!Array.isArray(list) || list.length === 0) {
            return remoteAllowed ? "Remote allowed" : null;
        }
        const labels = [];
        for (const it of list) {
            // can already be "Hybrid", or as URN "urn:li:fs_workplaceType:2"
            if (typeof it === "string" && !it.startsWith("urn:")) {
                labels.push(it);
                continue;
            }
            const token = lastUrnToken(String(it));
            const key = token && token.replace(/^fs_workplaceType:/, ""); // handle possible double segment
            const label = (key && WORKPLACE_TYPE_MAP[key]) || (humanizeToken(key) || String(it));
            labels.push(label);
        }
        // dedup
        return Array.from(new Set(labels)).join(", ");
    }

    function buildInsights(data) {
        // Overview (invariato)
        const applies = Number.isFinite(data?.applies) ? data.applies : null;
        const views = Number.isFinite(data?.views) ? data.views : null;
        const applyRate = (applies != null && views && views > 0) ? fmtPct(applies / views) : null;

        // 🔁 Workspace mapping (NUOVO)
        const workplaceTypesLabel = mapWorkplaceTypes(data?.workplaceTypes, !!data?.workRemoteAllowed);
        const remoteText = data?.workRemoteAllowed ? "Remote allowed" : null;

        // Salary (come prima)
        const formatted = data?.formattedSalaryDescription || null;
        const si = data?.salaryInsights || null;
        const provided = si?.providedByEmployer ?? null;
        const brk = Array.isArray(si?.compensationBreakdown) ? si.compensationBreakdown : [];
        const base = brk.find(x => x?.compensationType === "BASE_SALARY") || brk[0];

        let min = null, max = null, currency = null, period = null;
        if (base) {
            min = base.minSalary != null ? Number(base.minSalary) : null;
            max = base.maxSalary != null ? Number(base.maxSalary) : null;
            currency = base.currencyCode || null;
            period = base.payPeriod || null;
        }

        let salaryText = formatted || null;
        if (!salaryText && (min || max)) {
            const cur = currency || "EUR";
            const per = period === "MONTHLY" ? "/mo" : "/yr";
            const parts = [];
            if (min) parts.push(fmtCurrency(min, cur));
            parts.push("–");
            if (max) parts.push(fmtCurrency(max, cur));
            salaryText = parts.join(" ") + per;
        }

        let salaryMonthly = null;
        if (period === "YEARLY" && (min || max)) {
            const cur = currency || "EUR";
            const avg = (Number(min || max) + Number(max || min)) / 2;
            salaryMonthly = fmtCurrency(Math.round(avg / 12), cur) + "/mo";
        }

        // Dates (simplified, without unnecessary duplicates)
        const postedAt = data?.listedAt ?? null; // Posting date
        const expireAt = data?.expireAt ?? null; // Expiration date
        const applicationDeadlineAt = data?.applicationDeadlineAt ?? data?.applicationCloseDate ?? null;

        // 🔁 Functions & Industries mapping (NUOVO)
        const jobFunctionsLabel = data?.formattedJobFunctions || null;
        const industriesLabel = data?.formattedIndustries || null;

        // Advanced/meta (aggiungiamo le label mappate)
        const jobState = data?.jobState || data?.jobPostingState || null;
        const listingType = data?.listingType || null;
        const sponsored = data?.sponsored != null ? (data.sponsored ? "yes" : "no") : null;
        const youApplied = data?.applied != null ? (data.applied ? "yes" : "no") : null;
        const closed = data?.closed != null ? (data.closed ? "yes" : "no") : null;

        return {
            overview: {applies, views, applyRate, remoteText, offsiteUrl: data?.applyMethod?.["com.linkedin.voyager.jobs.OffsiteApply"]?.companyApplyUrl || null},
            salary: {salaryText, min, max, salaryMonthly, employerProvided: provided, currency, period},
            dates: {postedAt, expireAt, applicationDeadlineAt},
            advanced: {
                jobState, listingType, sponsored, youApplied, closed,
                remoteAllowed: data?.workRemoteAllowed ? "yes" : "no",
                workplaceTypes: data?.workplaceTypes || null,                 // raw
                workplaceTypesLabel,                                         // ✅ human-friendly
                employment: data?.employmentType || null,
                jobFunctions: data?.jobFunctions || null,                     // raw
                jobFunctionsLabel,                                           // ✅ human-friendly
                industries: data?.industries || null,                         // raw
                industriesLabel                                              // ✅ human-friendly
            }
        };
    }

    function render(insights, dbg) {
        // Metrics
        set("mApplies", insights.overview.applies ?? "—");
        set("mViews", insights.overview.views ?? "—");
        $("meta").textContent = `jobId: ${dbg.jobId ?? "—"}`;

        // Easy Apply
        if (insights.overview.offsiteUrl) {
            const a = $("easyApply");
            a.href = insights.overview.offsiteUrl;
            show("easyApply", true);
        } else {
            show("easyApply", false);
        }

        // Salary accordion
        const accSalary = $("accSalary");
        const hasSalary = insights.salary && (
            insights.salary.salaryText ||
            insights.salary.min != null ||
            insights.salary.max != null ||
            insights.salary.salaryMonthly ||
            insights.salary.employerProvided != null
        );
        if (accSalary) accSalary.classList.toggle("hide", !hasSalary);
        if (hasSalary) {
            set("sSalary", insights.salary.salaryText ?? "—");
            set("sMin", insights.salary.min != null ? fmtCurrency(insights.salary.min, insights.salary.currency || "EUR") : "—");
            set("sMax", insights.salary.max != null ? fmtCurrency(insights.salary.max, insights.salary.currency || "EUR") : "—");
            set("sMonthly", insights.salary.salaryMonthly ?? "—");
            set("sSource", insights.salary.employerProvided == null ? "—" : (insights.salary.employerProvided ? "Provided by employer" : "Estimate"));
            set("sMeta", `${insights.salary.currency || "-"}${insights.salary.period ? " · " + insights.salary.period.toLowerCase() : ""}`);
        }

        // Dates accordion (solo i campi distinti)
        set("dPosted", fmtDate(insights.dates.postedAt) ?? "—");
        set("dExpire", fmtDate(insights.dates.expireAt) ?? "—");
        set("dDeadline", fmtDate(insights.dates.applicationDeadlineAt) ?? "—");
        // Nascondi/ignora dListed, dOriginalListed, dValidThrough

        // Advanced accordion
        set("aState", insights.advanced.jobState ?? "—");
        set("aType", insights.advanced.listingType ?? "—");
        set("aSponsored", insights.advanced.sponsored ?? "—");
        set("aApplied", insights.advanced.youApplied ?? "—");
        set("aClosed", insights.advanced.closed ?? "—");
        set("aRemote", insights.advanced.remoteAllowed ?? "—");
        set("aWorkplace", insights.advanced.workplaceTypes ?? "—");
        set("aWorkplace", insights.advanced.workplaceTypesLabel ?? "—");
        set("aFunctions", insights.advanced.jobFunctionsLabel ?? "—");
        set("aIndustries", insights.advanced.industriesLabel ?? "—");

    }

    async function queryActiveTab() {
        return new Promise((resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => resolve(tabs?.[0]));
        });
    }

    function sendGet(tabId) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, {type: "GET_JOB_DETAILS"}, (resp) => {
                if (chrome.runtime.lastError) {
                    resolve({ok: false, error: chrome.runtime.lastError.message});
                } else {
                    resolve(resp || {ok: false, error: "No response"});
                }
            });
        });
    }

    function showLoadingOverlay(show = true) {
        const overlay = document.getElementById("loadingOverlay");
        if (overlay) overlay.classList.toggle("hide", !show);
    }

    async function run(fetchFresh = false) {
        showLoadingOverlay(true);
        const tab = await queryActiveTab();
        const panelData = $("panelData");
        const panelRedirect = $("panelRedirect");
        if (!tab || !tab.url) {
            panelData.classList.add("hide");
            panelRedirect.classList.remove("hide");
            setStatus("No active tab", false);
            showLoadingOverlay(false);
            return;
        }
        const url = new URL(tab.url);
        const onJobs = url.hostname.endsWith("linkedin.com") && url.pathname.startsWith("/jobs/");
        panelData.classList.toggle("hide", !onJobs);
        panelRedirect.classList.toggle("hide", onJobs === true);
        if (!onJobs) {
            setStatus("Open a LinkedIn /jobs/* page", false);
            showLoadingOverlay(false);
            return;
        }

        setStatus(fetchFresh ? "Refreshing…" : "Loading…");
        const resp = await sendGet(tab.id);
        if (!resp?.ok) {
            setStatus(resp?.error || "Failed", false);
            showLoadingOverlay(false);
            return;
        }

        const data = resp.data || {};
        const insights = buildInsights(data);
        render(insights, {jobId: resp.jobId});

        setStatus("Ready ✔", true);
        showLoadingOverlay(false);
        console.log(LOG, "OK", {applies: insights.overview.applies, views: insights.overview.views, jobId: resp.jobId});
    }

    // Buttons
    $("refresh").addEventListener("click", () => run(true));
    $("openCurrent").addEventListener("click", async () => {
        const tab = await queryActiveTab();
        if (tab?.id) chrome.tabs.reload(tab.id);
    });
    $("goJobs").addEventListener("click", async () => {
        const url = "https://www.linkedin.com/jobs/";
        const [tab] = await chrome.tabs.query({active: true, currentWindow: false});
        if (tab?.id) chrome.tabs.update(tab.id, {url});
        else chrome.tabs.create({url});
    });

    document.addEventListener("DOMContentLoaded", () => run(false));
})();
