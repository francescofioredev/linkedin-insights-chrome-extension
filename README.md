# LinkedIn Job Applies Inspector

A Chrome (MV3) extension that reveals the **exact number of applicants** for LinkedIn job postings — plus **views, salary details, key dates, workplace type, job functions, industries**, and more — all in a sleek **dark popup**.

> **Unofficial** — not affiliated with LinkedIn. All processing is local in your browser.

---

## ✨ Features

* **Applicants & Views always visible** in the popup header.
* **Salary** accordion: formatted range (min/max), currency & period, **\~monthly (gross)** estimate, employer-provided vs estimate.
* **Dates** accordion: created, posted, listed, original listed, expires, application deadline, valid through.
* **Advanced** accordion: job state, listing type, sponsored, you-applied, closed, **remote allowed**, **workplace types** (On‑site / Hybrid / Remote), **functions & industries** mapped to human labels.
* **Icon badge**: small blue badge on the extension icon when you’re on `linkedin.com/jobs/*`.
* **Works across all `/jobs/*`** pages and **adapts to SPA navigation**.
* **Local‑first**: no external servers; nothing is uploaded.

---

## 🧭 How it works (high level)

```
popup.html/js  ──(message)──▶ content.js ──(CustomEvent)──▶ injected.js
     ▲                                                  │
     └─────────────── receives data ◀─────── (fetch JSON + CSRF)
```

* **popup**: dark UI with accordions (Overview metrics always visible; Salary, Dates, Advanced).
* **content script**: loads on `https://www.linkedin.com/jobs/*`, finds the `jobId` (query, path, DOM), asks the page script to fetch.
* **injected page script**: runs in page context → reads `JSESSIONID` to build **`csrf-token`**, calls `/voyager/api/jobs/jobPostings/<JOB_ID>?topN=1` with `credentials: 'include'`, returns JSON.
* **background** (`bg.js`): shows/hides the blue badge based on the active tab’s URL.

---

## 📦 Install (Developer mode)

1. **Clone** the repo:

   ```bash
   git clone https://github.com/francescofioredev/linkedin-insights-chrome-extension.git
   cd linkedin-insights-chrome-extension
   ```
2. Ensure this **file structure** (simplified):

   ```
   README.md
   /resources/
     response.json
   /src/
     bg.js
     content.js
     injected.js
     popup.html
     popup.js
     manifest.json
     LICENSE
     /assets/
       icon-16.png  icon-32.png  icon-48.png  icon-128.png
   ```
3. Open Chrome → `chrome://extensions/` → toggle **Developer mode**.
4. Click **Load unpacked** → select the project folder.

> **Tip**: If icons don’t update, bump `"version"` in `manifest.json` and click **Reload**.

---

## ⚙️ Manifest (MV3) — important bits

The full manifest lives at [`/src/manifest.json`](./src/manifest.json). Key sections:

- `manifest_version: 3` — Chrome extension manifest version.
- `name`, `version`, `description` — Extension metadata.
- `action` — Popup and icon configuration.
- `icons` — Icon paths (see `/src/assets/`).
- `permissions` — Required Chrome permissions (e.g., `activeTab`, `storage`, `tabs`).
- `host_permissions` — URLs the extension can access (e.g., `https://www.linkedin.com/*`).
- `background` — Service worker script (`bg.js`).
- `content_scripts` — Scripts injected into LinkedIn job pages (`content.js`).
- `web_accessible_resources` — Resources accessible from the web context (e.g., `injected.js`).

See the manifest file for the full configuration and details.

---

## 🖥️ Usage

1. Open **any LinkedIn job page** (`https://www.linkedin.com/jobs/...`).
2. The extension icon shows a **blue badge** (•) → click it.
3. In the popup:
    * **Applicants & Views** are shown at the top.
    * Open **Salary**, **Dates**, or **Advanced** accordions for details.
    * Hit **Refresh** to re-fetch the current job’s data.

---

## 🔍 Data details & mappings

* **Applicants**: `data.applies` (direct).
* **Views**: `data.views` (when present), used to compute **Apply rate**.
* **Salary**: from `data.formattedSalaryDescription` and `data.salaryInsights.compensationBreakdown` (BASE\_SALARY → min/max, currency, period). We compute **monthly** as `(min..max)/12` (gross).
* **Dates**: common fields — `createdAt`, `postedAt`, `listedAt`, `originalListedAt`, `expireAt`/`validThrough`, `applicationDeadlineAt`/`applicationCloseDate`.
* **Workplace types**: `workplaceTypes` may be URNs (e.g., `urn:li:fs_workplaceType:2`) → mapped to **On‑site / Hybrid / Remote**.
* **Job functions**: `data.jobFunctions` (raw URNs/slugs), `data.formattedJobFunctions` (human-readable label).
* **Industries**: `data.industries` (raw URNs/slugs), `data.formattedIndustries` (human-readable label).

For a sample payload, see [`/resources/response.json`](./resources/response.json).

---

## 📚 Project docs

* **Privacy Policy** — [`PRIVACY.md`](./PRIVACY.md)
* **Security Policy** — [`SECURITY.md`](./SECURITY.md)
* **Disclaimer** — [`DISCLAIMER.md`](./DISCLAIMER.md)
* **License** — [`/src/LICENSE`](./src/LICENSE)

> If a document is missing, copy the templates from the repo’s docs or create them from the examples in issues/PRs.

---

## 🔐 Privacy & security (summary)

* **No servers**: all logic runs in your browser.
* We **do not** set the `Cookie` header manually. The page‑context script uses `fetch(..., { credentials: 'include' })` so the browser attaches cookies securely.
* The **`csrf-token`** header is derived from the `JSESSIONID` cookie value (usually `"ajax:..."`), read in page context and never persisted.
* No job data is stored or transmitted externally. Only minimal UI state may be kept in `chrome.storage`.

For full details, see [`PRIVACY.md`](./PRIVACY.md) and [`SECURITY.md`](./SECURITY.md).

---

## 🧰 Troubleshooting

* **Badge doesn’t appear** on the icon → Ensure you’re on `linkedin.com/jobs/*`. Check that `bg.js` is registered (reload the extension).
* **Popup says “Open a LinkedIn /jobs/* page”*\* → You’re not on a jobs page or LinkedIn blocked the view. Navigate to a job detail or a collection with a `currentJobId`.
* **Timeout / “Missing CSRF”** → You must be **logged in**. Ensure cookies are enabled for LinkedIn.
* **Applicants = n/d** → Some job payloads omit `applies`. Try refresh or another job; responses vary by listing/region.
* **“Invalid match pattern” on install** → In `manifest.json`, keep `web_accessible_resources[*].matches` as `*://*.linkedin.com/*`.

---

## 🛠️ Customization

* **Icon**: store PNGs in `/src/assets` and update `manifest.json` (`icons` & `action.default_icon`).
* **Labels**: edit mapping dictionaries in `/src/popup.js`.
* **UI**: tweak styles in `/src/popup.html` (dark theme / accordions / metrics layout).
* **Badge**: change color/text in `/src/bg.js` (`setBadgeText`, `setBadgeBackgroundColor`).

---

## 🗺️ Roadmap

* Options page (enable/disable fields, custom currency).
* TypeScript + ESLint.
* i18n for labels & formatting.
* Extra Voyager fields (only if stable across accounts).

---

## 🤝 Contributing

PRs are welcome! Please keep changes small and include a brief note on:

* What field(s) you added/changed.
* Any new mappings added to the dictionaries (workplace types, functions, industries).

Also see [`SECURITY.md`](./SECURITY.md) for responsible disclosure.

---

## ⚠️ Disclaimer

This project is for **educational and personal use**. Using internal endpoints or automations may violate LinkedIn’s **Terms of Service**. You use this software **at your own risk**.

For the full legal note, read [`DISCLAIMER.md`](./DISCLAIMER.md).

---

## 📄 License

MIT — see [`/src/LICENSE`](./src/LICENSE).
