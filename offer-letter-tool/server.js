const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load offer letter HTML template once at startup
const templatePath = path.join(__dirname, 'templates', 'offer_letter.html');

app.post('/generate-pdf', upload.single('founderSignature'), async (req, res) => {
  try {
    const {
      candidateName,
      jobTitle,
      department,
      reportingManager,
      dateOfJoining,
      totalCTC,
      offerDate,
      acceptanceDeadline,
    } = req.body;

    // Read template fresh each request (allows live editing during dev)
    let html = fs.readFileSync(templatePath, 'utf8');

    // Format dates to DD/MM/YYYY for display
    const fmt = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Build filename date (DDMMYYYY)
    const joiningDate = new Date(dateOfJoining);
    const filenameDateStr = [
      String(joiningDate.getDate()).padStart(2, '0'),
      String(joiningDate.getMonth() + 1).padStart(2, '0'),
      joiningDate.getFullYear(),
    ].join('');

    // Handle founder signature — convert to base64 data URI if uploaded
    let signatureHtml = '<p class="sig-name">Rakesh Venugopal</p>';
    if (req.file && req.file.mimetype === 'image/jpeg') {
      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64}`;
      signatureHtml = `<img src="${dataUri}" alt="Founder Signature" class="sig-image" /><p class="sig-name">Rakesh Venugopal</p>`;
    } else {
      signatureHtml = '<div class="sig-blank"></div><p class="sig-name">Rakesh Venugopal</p>';
    }

    // Load Mellone logo as base64 so Puppeteer can render it
    const logoPath = path.join(__dirname, 'public', 'assets', 'mellone_logo.png');
    let logoDataUri = '';
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }

    // Replace all template variables
    html = html
      .replace(/{{CANDIDATE_NAME}}/g, candidateName)
      .replace(/{{JOB_TITLE}}/g, jobTitle)
      .replace(/{{DEPARTMENT}}/g, department)
      .replace(/{{REPORTING_MANAGER}}/g, reportingManager)
      .replace(/{{DATE_OF_JOINING}}/g, fmt(dateOfJoining))
      .replace(/{{TOTAL_CTC}}/g, totalCTC)
      .replace(/{{OFFER_DATE}}/g, fmt(offerDate))
      .replace(/{{ACCEPTANCE_DEADLINE}}/g, fmt(acceptanceDeadline))
      .replace(/{{FOUNDER_SIGNATURE_HTML}}/g, signatureHtml)
      .replace(/{{MELLONE_LOGO_SRC}}/g, logoDataUri || '');

    // Launch Puppeteer and render PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    });

    await browser.close();

    const filename = `Offer_Letter_${candidateName.replace(/\s+/g, '_')}_${filenameDateStr}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF. ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mellone Offer Letter Tool running at http://localhost:${PORT}`);
});
