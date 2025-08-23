// content.js
// Injects 'injected.js' into the page context, listens for captured JSON, extracts applicant counts,
// and renders a floating badge. Stores last values in chrome.storage.local.

(() => {

    // --- Inject the page-context script (needed to patch window.fetch / XHR) ---
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    console.log('[LinkedInExt] URL injected.js:', script.src); // Debug log per URL
    script.async = false;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    // --- Simple settings (extend as needed) ---
    const DEFAULT_SETTINGS = {logging: true, enabled: true};
    let settings = {...DEFAULT_SETTINGS};
    let settingsLoaded = false;

    // Caricamento asincrono delle impostazioni
    chrome.storage?.local?.get({settings: DEFAULT_SETTINGS}, ({settings: s}) => {
        settings = {...DEFAULT_SETTINGS, ...(s || {})};
        settingsLoaded = true;
        log('Impostazioni caricate:', settings);
    });

    // --- Logging helper ---
    function log(...args) {
        if (settings.logging) {
            console.log('[LinkedInExt]', ...args);
        }
    }

    // --- Helpers ---
    const urlIsInteresting = (url) => {
        try {
            const u = new URL(url, location.origin);
            if (!u.hostname.match(/(^|\.)linkedin\.com$/i)) return false;
            // Interessa solo la specifica API dei job postings
            return u.pathname.startsWith('/voyager/api/jobs/jobPostings');
        } catch (e) {
            log('Errore parsing URL:', url, e);
            return false;
        }
    };

    // Prefer direct known paths here if you discover them in your account payloads
    function extractAppliesPreferExact(obj) {
        try {
            const res = obj?.data?.applies ?? obj?.applies ?? null;
            log('extractAppliesPreferExact:', res);
            return res;
        } catch (e) {
            log('Errore in extractAppliesPreferExact:', e);
            return null;
        }
    }

    // Generic recursive extractor: looks for numeric value attached to "applicants"ish keys
    const KEY_REGEX = /(applicants?|applies|application(count|s)|appliedCount|totalApplicants?|numApplicants?)/i;

    function extractAppliesGeneric(value) {
        let found = null;

        function visit(v, keyHint) {
            if (found !== null) return;
            if (v == null) return;
            const keyIsPromising = keyHint && KEY_REGEX.test(keyHint);
            if (typeof v === 'number' && Number.isFinite(v)) {
                if (keyIsPromising || (v >= 0 && v < 1e6)) {
                    found = v;
                    log('Trovato valore numerico:', found, 'per chiave', keyHint);
                    return;
                }
            }
            if (typeof v === 'string') {
                const m = v.match(/(\d{1,6})/);
                if (m) {
                    found = parseInt(m[1], 10);
                    log('Trovato valore stringa:', found, 'per chiave', keyHint);
                    return;
                }
            }
            if (Array.isArray(v)) {
                for (const el of v) {
                    visit(el, null);
                }
                return;
            }
            if (typeof v === 'object') {
                for (const [k, val] of Object.entries(v)) {
                    if (KEY_REGEX.test(k)) {
                        if (typeof val === 'number' && Number.isFinite(val)) {
                            found = val;
                            log('Trovato valore diretto:', found, 'per chiave', k);
                            return;
                        }
                        if (typeof val === 'string') {
                            const m = val.match(/(\d{1,6})/);
                            if (m) {
                                found = parseInt(m[1], 10);
                                log('Trovato valore diretto stringa:', found, 'per chiave', k);
                                return;
                            }
                        }
                    }
                }
                for (const [k, val] of Object.entries(v)) {
                    visit(val, k);
                }
            }
        }

        visit(value, null);
        return found;
    }

    function extractApplies(obj) {
        return extractAppliesPreferExact(obj) ?? extractAppliesGeneric(obj);
    }

    // UI badge
    function upsertBadge(value) {
        let badge = document.getElementById('li-job-applies-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'li-job-applies-badge';
            Object.assign(badge.style, {
                position: 'fixed',
                right: '12px',
                bottom: '12px',
                zIndex: '2147483647',
                padding: '8px 12px',
                background: '#0a66c2',
                color: 'white',
                borderRadius: '999px',
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
                fontSize: '13px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                cursor: 'default',
                userSelect: 'none',
                lineHeight: '1'
            });
            document.body.appendChild(badge);
        }
        badge.textContent = (value != null) ? `Applicants: ${value}` : `Applicants: n/d`;
    }

    function getJobIdFromUrl() {
        const m = location.pathname.match(/\/jobs\/view\/(\d+)/);
        return m ? m[1] : null;
    }

    // Cache latest values per jobId
    const cache = new Map();

    // Listen for captured responses from injected.js
    window.addEventListener('message', (ev) => {
        if (!ev.data || ev.data.type !== 'LI_FETCH_CAPTURED') return;
        const {url, ok, contentType, body} = ev.data.detail || {};
        log('Evento ricevuto:', {url, ok, contentType});
        const interesting = urlIsInteresting(url);
        log('urlIsInteresting:', interesting);
        if (!ok || !url || !interesting || !contentType) return;

        if (settings.logging) {
            try {
                log('Hit:', {url, sample: JSON.stringify(body).slice(0, 400)});
            } catch {}
        }

        const applies = extractApplies(body);
        if (applies == null) return;

        const jobId = getJobIdFromUrl() || '__page__';
        cache.set(jobId, applies);
        upsertBadge(applies);

        try {
            chrome.storage?.local?.set({[`applies:${jobId}`]: {applies, at: Date.now(), url: location.href}});
        } catch {}
    });

    // Handle SPA navigation: when DOM changes, re-show cached badge for current job
    const mo = new MutationObserver(() => {
        const jobId = getJobIdFromUrl();
        const cached = jobId ? cache.get(jobId) : null;
        if (cached != null) upsertBadge(cached);
    });
    mo.observe(document.documentElement, {childList: true, subtree: true});

})();
