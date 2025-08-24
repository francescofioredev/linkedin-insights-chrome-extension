# Privacy Policy — LinkedIn Job Inspector

**TL;DR:** This extension collects **no personal data** and sends **nothing** off your device.  
All processing happens **locally** in your browser on pages you open.

## What data is processed

- The extension reads job JSON **already available** in your LinkedIn session to show applicants, salary, and dates.
- Processing is **ephemeral** and **local** to the page; we do **not** store or transmit this data.

## What we do NOT do

- No analytics, telemetry, tracking, or fingerprinting.
- No selling or sharing of data.
- No access to cookies via extension APIs; page-context fetch relies on the browser’s authenticated session.

## Permissions & purpose

- `activeTab`, `tabs`: to detect LinkedIn Jobs pages and show a badge.
- `storage`: optional local UI prefs (none by default).
- `host_permissions: https://www.linkedin.com/*`: required to run on Jobs pages.
- Content script injects a page script to call `/voyager/api/jobs/jobPostings/<id>` with `credentials: include`.  
  A CSRF header is derived from the `JSESSIONID` value **in page context**; we don’t persist or exfiltrate it.

## Network

- The extension makes requests **only** to `linkedin.com` while you are logged in.
- No requests to third-party servers.

## Data retention

- None. We do not retain or store job payloads. Local storage may hold simple UI flags only.

## Children’s privacy

- Not directed to children.

## Changes

- We may update this document; the latest version will be in the repository.

## Contact

- Maintainer: [Open a GitHub issue](https://github.com/francescofioredev/linkedin-chrome-extension/issues)
