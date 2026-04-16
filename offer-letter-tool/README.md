# Mellone Offer Letter Generator

An internal HR tool for generating branded, print-ready offer letters as A4 PDFs.  
Built with Node.js + Express + Puppeteer.

---

## What It Does

- Presents a clean web form where HR fills in candidate details
- Generates a 3-page branded offer letter (Pages 1–2: body, Page 3: signatures)
- Downloads the result as a PDF named `Offer_Letter_[Name]_[DDMMYYYY].pdf`
- Optionally embeds a founder signature image (JPEG) on the signature page

---

## Prerequisites

- Node.js 18 or later
- Internet connection on first run (Puppeteer downloads Chromium, ~170 MB)

---

## Install

```bash
cd offer-letter-tool
npm install
```

> **Note:** `npm install` will trigger Puppeteer to download Chromium automatically. This is a one-time download of approximately 170 MB and is expected behaviour.

---

## Run

```bash
node server.js
```

Then open your browser and go to: **http://localhost:3000**

---

## Add the Mellone Logo

Drop the Mellone logo file into:

```
offer-letter-tool/public/assets/mellone_logo.png
```

The letterhead on all three pages will display it automatically. If the file is missing, the logo area will be blank — the rest of the letter will still generate correctly.

---

## Customise the Offer Letter Template

The full offer letter content lives in:

```
offer-letter-tool/templates/offer_letter.html
```

Open this file and replace the `[Placeholder — ...]` sections with your actual clause text. The template variables (`{{CANDIDATE_NAME}}`, `{{JOB_TITLE}}`, etc.) are injected at generation time — do not remove them.

**Template variables reference:**

| Variable | Description |
|---|---|
| `{{CANDIDATE_NAME}}` | Candidate's full name |
| `{{JOB_TITLE}}` | Job title / designation |
| `{{DEPARTMENT}}` | Department name |
| `{{REPORTING_MANAGER}}` | Reporting manager name & designation |
| `{{DATE_OF_JOINING}}` | Date of joining (formatted DD/MM/YYYY) |
| `{{TOTAL_CTC}}` | Annual CTC as entered |
| `{{OFFER_DATE}}` | Date of the offer letter (formatted DD/MM/YYYY) |
| `{{ACCEPTANCE_DEADLINE}}` | Acceptance deadline (formatted DD/MM/YYYY) |
| `{{FOUNDER_SIGNATURE_HTML}}` | Injected HTML — signature image or blank line |
| `{{MELLONE_LOGO_SRC}}` | Base64 data URI of the logo image |

---

## PDF Output

- **Format:** A4
- **Margins:** Top 20mm · Right 12mm · Bottom 12mm · Left 12mm
- **Filename:** `Offer_Letter_[CandidateName]_[DDMMYYYY].pdf`  
  (e.g., `Offer_Letter_Priya_Sharma_01062025.pdf`)

---

## Project Structure

```
offer-letter-tool/
  public/
    index.html          ← Form UI
    style.css           ← Mellone-branded form styles
    assets/
      mellone_logo.png  ← Add manually
  templates/
    offer_letter.html   ← Offer letter HTML template
  server.js             ← Express server + Puppeteer PDF generation
  package.json
  .gitignore
  README.md
```

---

## Notes

- This is an internal tool — no authentication is required
- The founder signature image is converted to a base64 data URI before being embedded in the PDF, so Puppeteer can render it without file-path issues
- Generated PDFs are streamed directly to the browser and not saved on disk
- The `node_modules/` folder and any `.pdf` files are excluded from version control via `.gitignore`
