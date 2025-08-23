// injected.js
// Page-context patch of window.fetch and XMLHttpRequest to capture JSON responses.
// Dispatches CustomEvents to the content script with the parsed body.

(() => {
    if (window.__li_fetch_patched) return;
    window.__li_fetch_patched = true;

    const dispatch = (detail) => {
        try {
            window.postMessage({ type: 'LI_FETCH_CAPTURED', detail }, '*');
        } catch (e) {
            console.error('[LinkedInExt injected.js] Errore in dispatch:', e);
        }
    };

    // Log prima di patchare fetch
    console.log('[LinkedInExt injected.js] Prima di patchare fetch:', window.fetch.toString());
    // console.log('[LinkedInExt injected.js] Patch attiva');

    // --- Patch fetch ---
    try {
        const _fetch = window.fetch;
        window.fetch = async function (...args) {
            let url = '';
            if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
                url = args[0].url;
            } else {
                url = args[0] || '';
            }
            // Processa solo le fetch che ci interessano
            if (!url.includes('/voyager/api/jobs/jobPostings')) {
                return _fetch.apply(this, args);
            }
            if (!/^https?:\/\//.test(url) ||
                url.startsWith('chrome-extension://') ||
                url.startsWith('chrome://') ||
                url.startsWith('devtools://') ||
                url.startsWith('about:') ||
                url.startsWith('chrome-extension://invalid/')) {
                return _fetch.apply(this, args);
            }
            let res;
            try {
                res = await _fetch.apply(this, args);
            } catch (e) {
                console.error('[LinkedInExt injected.js] Errore in fetch:', e);
                throw e;
            }
            try {
                const ct = res.headers.get('content-type') || '';
                if (ct.includes('application/json')) {
                    let clone, body = null;
                    try {
                        clone = res.clone();
                        body = await clone.json();
                    } catch (err) {
                        console.error('[LinkedInExt injected.js] Errore nel parsing JSON/clonazione:', err);
                    }
                    if (body) {
                        dispatch({
                            url: typeof url === 'string' ? url : String(url),
                            ok: res.ok,
                            status: res.status,
                            contentType: ct,
                            body
                        });
                    }
                }
                return res;
            } catch (e) {
                console.error('[LinkedInExt injected.js] Errore post-fetch:', e);
                return res;
            }
        };
    } catch (e) {
        console.error('[LinkedInExt injected.js] Errore patch fetch globale:', e);
    }

    // --- Patch XMLHttpRequest ---
    try {
        const _open = XMLHttpRequest.prototype.open;
        const _send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            try {
                this.__li_url = url;
            } catch (e) {
                console.error('[LinkedInExt injected.js] Errore in XHR open:', e);
            }
            return _open.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.send = function (...args) {
            this.addEventListener('load', function () {
                const urlRaw = this.__li_url || this.responseURL || '';
                if (!urlRaw.includes('/voyager/api/jobs')) return;
                console.log('[LinkedInExt injected.js] Catturata XHR:', urlRaw);
                let url = urlRaw;
                if (url && url.startsWith('/')) {
                    url = location.origin + url;
                }
                try {
                    const ct = this.getResponseHeader('content-type') || '';
                    if (ct.includes('application/json') && this.responseText) {
                        let body = null;
                        try {
                            body = JSON.parse(this.responseText);
                        } catch (e) {
                            console.error('[LinkedInExt injected.js] Errore parsing JSON XHR:', e);
                        }
                        if (body) {
                            dispatch({
                                url,
                                ok: this.status >= 200 && this.status < 300,
                                status: this.status,
                                contentType: ct,
                                body
                            });
                        }
                    }
                } catch (e) {
                    console.error('[LinkedInExt injected.js] Errore XHR patch:', e);
                }
            });
            return _send.apply(this, args);
        };
    } catch (e) {
        console.error('[LinkedInExt injected.js] Errore patch XHR globale:', e);
    }
})();
