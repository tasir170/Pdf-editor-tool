import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates an elegant sample PDF document with multiple pages (Invoice & Project Proposal)
 * so users can test merging, editing, splitting, and resizing right away.
 */
export async function createSamplePdf(type: 'contract' | 'report' | 'multipage' = 'multipage'): Promise<{ data: Uint8Array; name: string }> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Executive Proposal / Agreement
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const { width: p1W, height: p1H } = page1.getSize();

  // Top header bar
  page1.drawRectangle({
    x: 0,
    y: p1H - 90,
    width: p1W,
    height: 90,
    color: rgb(0.09, 0.15, 0.28),
  });

  page1.drawText('SAJEDA DIGITAL SOLUTIONS', {
    x: 40,
    y: p1H - 50,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('CONFIDENTIAL CLIENT SERVICE AGREEMENT · 2026', {
    x: 40,
    y: p1H - 70,
    size: 10,
    font: fontRegular,
    color: rgb(0.65, 0.75, 0.9),
  });

  // Client Details Box
  page1.drawRectangle({
    x: 40,
    y: p1H - 200,
    width: p1W - 80,
    height: 80,
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1.0),
  });

  page1.drawText('PREPARED FOR:', {
    x: 55,
    y: p1H - 145,
    size: 9,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.55),
  });

  page1.drawText('Acme Global Enterprises Corp.', {
    x: 55,
    y: p1H - 165,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page1.drawText('Attn: Operations & Strategy Division · San Francisco, CA', {
    x: 55,
    y: p1H - 185,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4),
  });

  page1.drawText('Date: October 2026', {
    x: p1W - 180,
    y: p1H - 145,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4),
  });

  page1.drawText('Ref: SJD-2026-894', {
    x: p1W - 180,
    y: p1H - 165,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.35, 0.8),
  });

  // Section 1 Content
  page1.drawText('1. SCOPE OF SERVICES', {
    x: 40,
    y: p1H - 235,
    size: 12,
    font: fontBold,
    color: rgb(0.09, 0.15, 0.28),
  });

  const bodyParagraph1 = 
    'The provider shall deliver full-stack digital document workflow automation, secure local processing\n' +
    'infrastructure, and PDF generation suites compliant with international data retention protocols.\n' +
    'All deliverables undergo automated regression verification prior to final staging deployment.';

  page1.drawText(bodyParagraph1, {
    x: 40,
    y: p1H - 260,
    size: 10,
    font: fontRegular,
    lineHeight: 15,
    color: rgb(0.25, 0.3, 0.35),
  });

  // Table header
  const tableY = p1H - 350;
  page1.drawRectangle({
    x: 40,
    y: tableY,
    width: p1W - 80,
    height: 25,
    color: rgb(0.92, 0.94, 0.98),
  });

  page1.drawText('ITEM DESCRIPTION', { x: 50, y: tableY + 8, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  page1.drawText('QTY', { x: 300, y: tableY + 8, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  page1.drawText('UNIT RATE', { x: 370, y: tableY + 8, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  page1.drawText('TOTAL AMOUNT', { x: 450, y: tableY + 8, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });

  const rows = [
    { desc: 'PDF Processing Core Architecture', qty: '1', rate: '$4,500.00', total: '$4,500.00' },
    { desc: 'Visual Page Reordering & Merge Engine', qty: '1', rate: '$2,800.00', total: '$2,800.00' },
    { desc: 'Interactive Annotation & Whiteout Suite', qty: '1', rate: '$3,200.00', total: '$3,200.00' },
    { desc: 'High-Fidelity Document Resizer module', qty: '1', rate: '$1,500.00', total: '$1,500.00' },
  ];

  rows.forEach((r, idx) => {
    const rowY = tableY - 26 * (idx + 1);
    page1.drawRectangle({
      x: 40,
      y: rowY,
      width: p1W - 80,
      height: 26,
      borderColor: rgb(0.9, 0.92, 0.95),
      borderWidth: 0.5,
      color: idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.99, 1),
    });
    page1.drawText(r.desc, { x: 50, y: rowY + 8, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page1.drawText(r.qty, { x: 305, y: rowY + 8, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page1.drawText(r.rate, { x: 370, y: rowY + 8, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page1.drawText(r.total, { x: 450, y: rowY + 8, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  });

  // Total summary box
  const sumY = tableY - 26 * 5 - 15;
  page1.drawRectangle({
    x: p1W - 220,
    y: sumY,
    width: 180,
    height: 45,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.8, 0.86, 0.96),
    borderWidth: 1,
  });
  page1.drawText('GRAND TOTAL:', { x: p1W - 210, y: sumY + 25, size: 10, font: fontBold, color: rgb(0.3, 0.35, 0.45) });
  page1.drawText('$12,000.00 USD', { x: p1W - 210, y: sumY + 10, size: 14, font: fontBold, color: rgb(0.1, 0.4, 0.85) });

  // Signature box
  page1.drawText('AUTHORIZED SIGNATURE & APPROVAL', {
    x: 40,
    y: 120,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  page1.drawLine({
    start: { x: 40, y: 70 },
    end: { x: 260, y: 70 },
    thickness: 1,
    color: rgb(0.6, 0.65, 0.7),
  });
  page1.drawText('Authorized Client Signatory (Sign Here)', { x: 40, y: 55, size: 8, font: fontRegular, color: rgb(0.5, 0.55, 0.6) });

  page1.drawLine({
    start: { x: 335, y: 70 },
    end: { x: 555, y: 70 },
    thickness: 1,
    color: rgb(0.6, 0.65, 0.7),
  });
  page1.drawText('Date of Signing', { x: 335, y: 55, size: 8, font: fontRegular, color: rgb(0.5, 0.55, 0.6) });

  // Page 2: Terms and Conditions
  if (type === 'multipage' || type === 'contract') {
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    const { width: p2W, height: p2H } = page2.getSize();

    page2.drawRectangle({
      x: 0,
      y: p2H - 50,
      width: p2W,
      height: 50,
      color: rgb(0.95, 0.96, 0.98),
    });
    page2.drawText('TERMS & CONDITIONS · APPENDIX A', {
      x: 40,
      y: p2H - 32,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    const clauses = [
      { title: '1. Proprietary Rights', text: 'All intellectual property rights arising from or developed in connection with this agreement shall remain with the customer upon verified payment receipt.' },
      { title: '2. Confidentiality & Security', text: 'Both parties agree to protect proprietary specifications and avoid unauthorized disclosure of operational parameters.' },
      { title: '3. Quality Assurance & Verification', text: 'A formal inspection window of fifteen (15) calendar days begins upon documented transmission of deliverables.' },
      { title: '4. Governing Jurisdiction', text: 'This agreement shall be interpreted and enforced according to standard commercial statutes.' },
    ];

    clauses.forEach((c, i) => {
      const cY = p2H - 100 - (i * 90);
      page2.drawText(c.title, { x: 40, y: cY, size: 11, font: fontBold, color: rgb(0.15, 0.35, 0.75) });
      page2.drawText(c.text, { x: 40, y: cY - 20, size: 9, font: fontRegular, color: rgb(0.3, 0.35, 0.4), lineHeight: 14 });
    });

    // Checkbox questionnaire for testing form/edit
    page2.drawText('CHECKLIST FOR DEPLOYMENT (Use Edit PDF to Mark):', {
      x: 40,
      y: 300,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });

    const checks = [
      'Document security verification completed',
      'Original metadata sanitized and approved',
      'Sign-off received from financial officer',
      'Archive copy committed to local storage',
    ];

    checks.forEach((item, i) => {
      const itemY = 265 - (i * 35);
      page2.drawRectangle({
        x: 40,
        y: itemY,
        width: 16,
        height: 16,
        borderColor: rgb(0.6, 0.65, 0.75),
        borderWidth: 1.5,
        color: rgb(1, 1, 1),
      });
      page2.drawText(item, { x: 68, y: itemY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
    });
  }

  // Page 3: Summary Sheet
  if (type === 'multipage') {
    const page3 = pdfDoc.addPage([595.28, 841.89]);
    const { width: p3W, height: p3H } = page3.getSize();

    page3.drawText('PAGE 3: AUDIT TRAIL & REVISION LOG', {
      x: 40,
      y: p3H - 60,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    page3.drawText('This extra page can be easily split, deleted, or reordered in the Sajeda workspace.', {
      x: 40,
      y: p3H - 90,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });

    page3.drawRectangle({
      x: 40,
      y: p3H - 300,
      width: p3W - 80,
      height: 180,
      borderColor: rgb(0.85, 0.88, 0.95),
      borderWidth: 1,
      color: rgb(0.98, 0.99, 1.0),
    });

    page3.drawText('DOCUMENT REVISION LOG', {
      x: 60,
      y: p3H - 150,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.5),
    });

    const logs = [
      'v1.0 - Initial Draft Created (Ready for Merge / Edit)',
      'v1.1 - Added Appendix A (Terms & Conditions)',
      'v1.2 - Ready for Client Signature and Whiteout/Redact testing',
    ];

    logs.forEach((log, i) => {
      page3.drawText(`• ${log}`, {
        x: 60,
        y: p3H - 180 - (i * 25),
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.35, 0.4),
      });
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    data: pdfBytes,
    name: 'sample_service_contract.pdf',
  };
}

/**
 * Creates a second distinct PDF file for testing Merge PDF
 */
export async function createSecondSamplePdf(): Promise<{ data: Uint8Array; name: string }> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: rgb(0.12, 0.45, 0.35),
  });

  page.drawText('ATTACHMENT B: TECHNICAL SPECIFICATIONS', {
    x: 40,
    y: height - 45,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Supplementary documentation to merge with original contract', {
    x: 40,
    y: height - 65,
    size: 9,
    font: fontRegular,
    color: rgb(0.8, 0.95, 0.9),
  });

  page.drawText('System Requirements & Infrastructure Guidelines', {
    x: 40,
    y: height - 120,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.2),
  });

  const notes = [
    '• Zero external upload required: all operations run via client WebAssembly / JS.',
    '• High-resolution vector retention on merge and page manipulation.',
    '• Supports multi-page mix and match reordering across multiple PDF documents.',
  ];

  notes.forEach((n, i) => {
    page.drawText(n, {
      x: 40,
      y: height - 150 - (i * 30),
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.4),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return {
    data: pdfBytes,
    name: 'attachment_specifications.pdf',
  };
}

/**
 * Creates a high quality sample graphic image data URL for testing Image to PDF
 */
export function createSampleImageDataUrl(title: string, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 800, 600);

  // Gradient card
  const grad = ctx.createLinearGradient(0, 0, 800, 600);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(40, 40, 720, 520);

  // Decorative border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, 680, 480);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 80, 160);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Digital Document Asset · High Resolution Scan', 80, 210);

  // Sample graphic lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(80, 270, 400, 24);
  ctx.fillRect(80, 310, 560, 16);
  ctx.fillRect(80, 340, 500, 16);
  ctx.fillRect(80, 370, 380, 16);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('ID: SCAN-2026-X89 · READY FOR IMAGE TO PDF CONVERSION', 80, 470);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Creates realistic CNIC / ID Card Front and Back sample images
 * for testing 2-in-1 card layout on one A4 paper.
 */
export function createSampleCnicImages(): { front: string; back: string } {
  // 1. CNIC Front
  const c1 = document.createElement('canvas');
  c1.width = 650;
  c1.height = 410;
  const ctx1 = c1.getContext('2d')!;

  // Card background
  const grad1 = ctx1.createLinearGradient(0, 0, 650, 410);
  grad1.addColorStop(0, '#e0f2fe');
  grad1.addColorStop(1, '#bae6fd');
  ctx1.fillStyle = grad1;
  ctx1.fillRect(0, 0, 650, 410);

  ctx1.strokeStyle = '#0284c7';
  ctx1.lineWidth = 3;
  ctx1.strokeRect(10, 10, 630, 390);

  // Top header
  ctx1.fillStyle = '#0369a1';
  ctx1.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx1.fillText('ISLAMIC REPUBLIC OF PAKISTAN', 120, 40);
  ctx1.font = '12px "Plus Jakarta Sans", sans-serif';
  ctx1.fillText('National Identity Card / CNIC (Front Side)', 120, 60);

  // Chip
  ctx1.fillStyle = '#fbbf24';
  ctx1.fillRect(35, 90, 60, 45);
  ctx1.strokeStyle = '#d97706';
  ctx1.lineWidth = 1.5;
  ctx1.strokeRect(35, 90, 60, 45);

  // Photo Box
  ctx1.fillStyle = '#cbd5e1';
  ctx1.fillRect(490, 75, 120, 150);
  ctx1.strokeStyle = '#94a3b8';
  ctx1.strokeRect(490, 75, 120, 150);
  ctx1.fillStyle = '#64748b';
  ctx1.font = 'bold 12px sans-serif';
  ctx1.fillText('PHOTO', 528, 155);

  // Details
  ctx1.fillStyle = '#0f172a';
  ctx1.font = 'bold 13px sans-serif';
  ctx1.fillText('Name: MUHAMMAD USMAN', 120, 115);
  ctx1.font = '12px sans-serif';
  ctx1.fillText('Father Name: TARIQ MEHMOOD', 120, 145);
  ctx1.fillText('Gender: M  ·  Country of Stay: Pakistan', 120, 175);
  ctx1.fillText('Identity Number: 35201-8974512-3', 120, 205);
  ctx1.fillText('Date of Birth: 14.08.1995', 120, 235);
  ctx1.fillText('Date of Issue: 10.05.2023  ·  Valid Until: 10.05.2033', 120, 265);

  // Bottom MRZ lines
  ctx1.fillStyle = '#0369a1';
  ctx1.font = 'bold 13px monospace';
  ctx1.fillText('IDPAK3520189745123<<<<<<<<<<<<<<<<<', 40, 340);
  ctx1.fillText('9508144M3305108PAK<<<<<<<<<<<<<<<4', 40, 365);

  const front = c1.toDataURL('image/jpeg', 0.92);

  // 2. CNIC Back
  const c2 = document.createElement('canvas');
  c2.width = 650;
  c2.height = 410;
  const ctx2 = c2.getContext('2d')!;

  const grad2 = ctx2.createLinearGradient(0, 0, 650, 410);
  grad2.addColorStop(0, '#f0fdf4');
  grad2.addColorStop(1, '#bbf7d0');
  ctx2.fillStyle = grad2;
  ctx2.fillRect(0, 0, 650, 410);

  ctx2.strokeStyle = '#16a34a';
  ctx2.lineWidth = 3;
  ctx2.strokeRect(10, 10, 630, 390);

  ctx2.fillStyle = '#15803d';
  ctx2.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx2.fillText('NATIONAL IDENTITY CARD (BACK SIDE)', 40, 40);

  ctx2.fillStyle = '#0f172a';
  ctx2.font = '12px sans-serif';
  ctx2.fillText('Present Address: House #42, Street 7, Sector F-8/2, Islamabad', 40, 80);
  ctx2.fillText('Permanent Address: Chak 128-RB, Faisalabad, Punjab', 40, 110);

  // QR / Barcode simulation
  ctx2.fillStyle = '#334155';
  for (let i = 0; i < 60; i++) {
    const w = (i % 3 === 0 ? 4 : 2);
    ctx2.fillRect(40 + i * 8, 160, w, 45);
  }

  ctx2.font = 'bold 11px sans-serif';
  ctx2.fillStyle = '#166534';
  ctx2.fillText('If found, please drop in nearest postal drop box or return to NADRA', 40, 240);

  // Signatures
  ctx2.strokeStyle = '#64748b';
  ctx2.lineWidth = 1;
  ctx2.beginPath();
  ctx2.moveTo(420, 320);
  ctx2.lineTo(590, 320);
  ctx2.stroke();
  ctx2.font = '10px sans-serif';
  ctx2.fillStyle = '#64748b';
  ctx2.fillText('Registrar General Signature', 440, 335);

  const back = c2.toDataURL('image/jpeg', 0.92);

  return { front, back };
}

