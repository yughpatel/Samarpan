# Samarpan Community Platform

Website for **Samarpan – Gujarati Cultural Association, Kuwait** (under the aegis of the Indian Embassy, Kuwait), digitizing membership and event work that is currently done on paper.

## Design goals
- **Phone-first**, bilingual (English + ગુજરાતી).
- **Near-zero maintenance & secure by default** — the association has no dedicated technical maintainer, so we avoid running any self-hosted server or database.

## Architecture
- **Public website** — static HTML/CSS/JS in this repo, served from a free static host (Netlify / Cloudflare Pages). No server to patch.
- **Membership intake & records** — a **Google Form → Google Sheet** owned by the association (replaces the paper form and the Excel register). Photos are uploaded via the form (Google sign-in required).
- **Membership ID + QR pass** — a **Google Apps Script** on the Sheet auto-generates a member ID and a digital membership card, emailed on committee approval.
- **Payments** — **MyFatoorah** hosted payment links (no API keys or server involved).

## Local preview
It's a static site — serve the folder with any static server:

```bash
python -m http.server 5501
```

Then open http://localhost:5501.

## Repo layout
- `index.html`, `about.html`, `events.html`, `gallery.html`, `news.html`, `contact.html`, `join.html` — pages
- `components/` — shared header & footer (loaded client-side)
- `assets/` — CSS, JS, images (logo)
- `docs/committee-brief.html` — briefing + open questions for the committee
- `Samarpan Membership form (1)_*.pdf` — the original paper form (reference)

## Status
Front end built. Google Form intake, ID/QR automation, and payments are the next phases — several items need committee input first (see `docs/committee-brief.html`).
