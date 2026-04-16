const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const templatePath = path.join(__dirname, 'templates', 'offer_letter.html');
const logoPath = path.join(__dirname, 'public', 'assets', 'mellone_logo.png');

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '';
  // Input is YYYY-MM-DD from date picker; parse as local date to avoid UTC offset shift
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getLogoDataUri() {
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
  return '';
}

function buildSignatureHtml(file) {
  if (file && file.mimetype === 'image/jpeg') {
    const dataUri = `data:image/jpeg;base64,${file.buffer.toString('base64')}`;
    return `<img src="${dataUri}" alt="Founder Signature" class="sig-image" />`;
  }
  return '<div class="sig-line"></div>';
}

function buildHtml(body, signatureHtml, logoDataUri) {
  const {
    candidateName,
    jobTitle,
    department,
    reportingManager,
    dateOfJoining,
    totalCTC,
    offerDate,
    acceptanceDeadline,
  } = body;

  let html = fs.readFileSync(templatePath, 'utf8');

  return html
    .replace(/{{CANDIDATE_NAME}}/g, candidateName || '')
    .replace(/{{JOB_TITLE}}/g, jobTitle || '')
    .replace(/{{DEPARTMENT}}/g, department || '')
    .replace(/{{REPORTING_MANAGER}}/g, reportingManager || '')
    .replace(/{{DATE_OF_JOINING}}/g, fmt(dateOfJoining))
    .replace(/{{TOTAL_CTC}}/g, totalCTC || '')
    .replace(/{{OFFER_DATE}}/g, fmt(offerDate))
    .replace(/{{ACCEPTANCE_DEADLINE}}/g, fmt(acceptanceDeadline))
    .replace(/{{FOUNDER_SIGNATURE_HTML}}/g, signatureHtml)
    .replace(/{{MELLONE_LOGO_SRC}}/g, logoDataUri);
}

function filenameDate(dateOfJoining) {
  if (!dateOfJoining) return '00000000';
  const [y, m, d] = dateOfJoining.split('-');
  return `${d}${m}${y}`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ ok: true }));

// Preview — returns rendered HTML for browser display
app.post('/preview', upload.single('founderSignature'), (req, res) => {
  try {
    const html = buildHtml(req.body, buildSignatureHtml(req.file), getLogoDataUri());
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: 'Preview failed. ' + err.message });
  }
});

// Generate PDF — renders via Puppeteer and streams the file
app.post('/generate-pdf', upload.single('founderSignature'), async (req, res) => {
  let browser;
  try {
    const html = buildHtml(req.body, buildSignatureHtml(req.file), getLogoDataUri());

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // networkidle2 (≤2 open connections) avoids hanging on external font requests
    // while still allowing Google Fonts to finish loading before capture
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '12mm', bottom: '12mm', left: '12mm' },
      timeout: 60000,
    });

    await browser.close();
    browser = null;

    const safeName = (req.body.candidateName || 'Candidate').replace(/\s+/g, '_');
    const datePart = filenameDate(req.body.dateOfJoining);
    const filename = `Offer_Letter_${safeName}_${datePart}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mellone Offer Letter Tool → http://localhost:${PORT}`);
});
