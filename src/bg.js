const BLUE = "#0a66c2";

function isJobsUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname.endsWith("linkedin.com") && u.pathname.startsWith("/jobs/") && u.searchParams.has("currentJobId");
    } catch {
        return false;
    }
}

// Set badge text and color for LinkedIn Jobs detection
async function updateBadge(tabId, url) {
    if (!tabId) return;
    if (isJobsUrl(url)) {
        await chrome.action.setBadgeText({tabId, text: "!"});     // small dot
        await chrome.action.setBadgeBackgroundColor({tabId, color: BLUE});
        // (optional) Chrome 114+: text color
        if (chrome.action.setBadgeTextColor) {
            try {
                await chrome.action.setBadgeTextColor({tabId, color: "#ffffff"});
            } catch {
            }
        }
        await chrome.action.setTitle({tabId, title: "LinkedIn Jobs detected — click to open insights"});
    } else {
        await chrome.action.setBadgeText({tabId, text: ""});      // hides the badge
        await chrome.action.setTitle({tabId, title: "LinkedIn Job Insights"});
    }
}

// 1) URL/tab change (covers almost all cases)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === "complete") {
        updateBadge(tabId, changeInfo.url || tab?.url || "");
    }
});

chrome.tabs.onActivated.addListener(async ({tabId}) => {
    const tab = await chrome.tabs.get(tabId);
    updateBadge(tabId, tab.url || "");
});

// 2) On extension startup/update
chrome.runtime.onInstalled.addListener(async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (tab) updateBadge(tab.id, tab.url || "");
});

// 3) Ping from content script (for SPA or edge cases)
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type === "JOBS_CONTEXT_PING" && sender.tab?.id) {
        updateBadge(sender.tab.id, sender.tab.url || "");
    }
});
