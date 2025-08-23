# LinkedIn Job Applies Inspector

Chrome extension that reveals the **exact number of applicants** on LinkedIn job postings by intercepting the JSON data exchanged between the frontend and LinkedIn APIs.
No scraping, no guesswork — just real-time insights into job application counts.

---

## ✨ Features

* ✅ Displays the **true applicant count** on each LinkedIn job page.
* ✅ Works by capturing JSON payloads from LinkedIn’s own API calls.
* ✅ Lightweight: built with Manifest V3, vanilla JS.
* ✅ Badge overlay always visible on the job view.
* ✅ Fully local: no external servers, your data never leaves the browser.

---

## 📦 Installation

1. Clone or download this repository:

   ```bash
   git clone https://github.com/francescofioredev/linkedin-applies-extension.git
   ```
2. Open **Chrome** and go to:

   ```
   chrome://extensions/
   ```
3. Enable **Developer mode** (top-right corner).
4. Click **“Load unpacked”** and select the project folder.
5. Done! The extension is now active.

---

## ▶️ Usage

1. Navigate to any LinkedIn job offer, e.g.:

   ```
   https://www.linkedin.com/jobs/view/<JOB_ID>/
   ```
2. Wait a moment while the page loads.
3. A floating badge will appear in the bottom-right corner:

   ```
   Applicants: 123
   ```
4. That’s the **exact count** from LinkedIn’s own data.

---

## 🛠 How it works

* Injects a script into the page that **patches `fetch` and `XMLHttpRequest`**.
* Intercepts JSON responses from LinkedIn GraphQL/REST endpoints.
* Extracts fields like `applicants`, `applicationCount`, etc.
* Displays the parsed number in a badge overlay.

This avoids brittle DOM scraping — even if LinkedIn changes their frontend markup, as long as the JSON structure still contains applicant counts, the extension will work.

---

## ⚠️ Disclaimer

This project is intended **for educational and personal use only**.
Interacting with LinkedIn data in this way may violate their Terms of Service.
Use responsibly and at your own risk.

---

## 📸 Screenshots

*(to be added)*

* Example job view with badge
* Developer console showing intercepted JSON

---

## 🤝 Contributing

Pull requests and suggestions are welcome!
If you discover a more stable JSON path for applicant counts, feel free to open a PR.

---

## 📜 License

MIT License – free to use, modify, and share.
