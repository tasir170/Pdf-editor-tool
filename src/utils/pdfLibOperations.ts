import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import type { UploadedImage, MergePageItem, Annotation, ResizeOptions, PaperImageElement, PaperTextElement } from '../types/pdf';

// Standard page sizes in Points (72 points = 1 inch)
export const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
  A3: [841.89, 1190.55],
  A5: [419.53, 595.28],
  Executive: [522, 756],
};

// Helper: parse hex color to pdf-lib rgb
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * 1. IMAGE TO PDF
 */
export interface ImageToPdfOptions {
  pageSize: 'fit' | 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
  orientation: 'auto' | 'portrait' | 'landscape';
  marginPt: number;
}

export async function convertImagesToPdf(
  images: UploadedImage[],
  options: ImageToPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    const dataUrl = img.processedDataUrl || img.originalDataUrl;
    const base64Data = dataUrl.split(',')[1];
    const isPng = dataUrl.startsWith('data:image/png');
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const embeddedImage = isPng
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

    const imgW = embeddedImage.width;
    const imgH = embeddedImage.height;

    let targetW = imgW;
    let targetH = imgH;

    if (options.pageSize === 'fit') {
      targetW = imgW + options.marginPt * 2;
      targetH = imgH + options.marginPt * 2;
    } else {
      const std = PAGE_SIZES[options.pageSize] || PAGE_SIZES.A4;
      targetW = std[0];
      targetH = std[1];

      if (options.orientation === 'landscape' || (options.orientation === 'auto' && imgW > imgH)) {
        if (targetW < targetH) {
          const temp = targetW;
          targetW = targetH;
          targetH = temp;
        }
      } else if (options.orientation === 'portrait') {
        if (targetW > targetH) {
          const temp = targetW;
          targetW = targetH;
          targetH = temp;
        }
      }
    }

    const page = pdfDoc.addPage([targetW, targetH]);
    const usableW = Math.max(10, targetW - options.marginPt * 2);
    const usableH = Math.max(10, targetH - options.marginPt * 2);

    // Scale image while preserving aspect ratio
    const scale = Math.min(usableW / imgW, usableH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const x = options.marginPt + (usableW - drawW) / 2;
    const y = options.marginPt + (usableH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  return await pdfDoc.save();
}

/**
 * Compiles an interactive paper sheet with multiple draggable images and text labels into a real PDF
 */
export async function convertPaperSheetToPdf(
  pageWidthPt: number,
  pageHeightPt: number,
  images: PaperImageElement[],
  texts: PaperTextElement[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // Draw images
  for (const img of images) {
    try {
      const base64Data = img.dataUrl.split(',')[1];
      const isPng = img.dataUrl.startsWith('data:image/png');
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const embedded = isPng
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

      // In PDF coordinates: (0,0) is bottom-left, canvas coordinates (0,0) is top-left
      const pdfY = pageHeightPt - img.y - img.height;

      page.drawImage(embedded, {
        x: img.x,
        y: pdfY,
        width: img.width,
        height: img.height,
      });
    } catch (e) {
      console.error('Failed to embed paper image:', e);
    }
  }

  // Draw text annotations
  for (const t of texts) {
    try {
      const rgbColor = hexToRgb(t.color || '#0f172a');
      const font = t.isBold ? fontHelveticaBold : fontHelvetica;
      const pdfY = pageHeightPt - t.y - t.fontSize * 0.85;

      const safeText = (t.text || '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[^\x20-\x7E\r\n\t]/g, '');

      if (!safeText) continue;

      const fontSize = t.fontSize || 12;
      const textWidth = font.widthOfTextAtSize(safeText, fontSize);
      const textHeight = fontSize * 1.15;

      // Draw background container if enabled
      if (t.backgroundColor && t.backgroundColor !== 'none') {
        const padX = 5;
        const padY = 3;
        const bgX = t.x - padX;
        const bgY = pdfY - padY;
        const bgW = textWidth + padX * 2;
        const bgH = textHeight + padY * 2;

        if (t.backgroundColor === 'white') {
          page.drawRectangle({
            x: bgX,
            y: bgY,
            width: bgW,
            height: bgH,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.8, 0.82, 0.86),
            borderWidth: 0.5,
          });
        } else if (t.backgroundColor === 'yellow') {
          page.drawRectangle({
            x: bgX,
            y: bgY,
            width: bgW,
            height: bgH,
            color: rgb(1, 0.98, 0.72),
            borderColor: rgb(0.95, 0.85, 0.3),
            borderWidth: 0.5,
          });
        } else if (t.backgroundColor === 'stamp') {
          page.drawRectangle({
            x: bgX,
            y: bgY,
            width: bgW,
            height: bgH,
            color: rgb(1, 1, 1),
            borderColor: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            borderWidth: 1.5,
          });
        }
      }

      page.drawText(safeText, {
        x: t.x,
        y: pdfY,
        size: fontSize,
        font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
      });
    } catch (e) {
      console.error('Failed to embed paper text:', e);
    }
  }

  return await pdfDoc.save();
}

/**
 * 2. MERGE PDF FILES (WITH PAGE-BY-PAGE REORDERING & ROTATION)
 */
export async function mergePdfPages(
  pages: MergePageItem[],
  sourceFiles: Map<string, Uint8Array>
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  // Cache loaded source documents
  const loadedDocs = new Map<string, PDFDocument>();
  for (const [fileId, bytes] of sourceFiles.entries()) {
    const doc = await PDFDocument.load(bytes);
    loadedDocs.set(fileId, doc);
  }

  for (const item of pages) {
    const srcDoc = loadedDocs.get(item.fileId);
    if (!srcDoc) continue;

    const [copiedPage] = await mergedPdf.copyPages(srcDoc, [item.originalPageIndex]);
    
    // Apply extra user-applied rotation if any
    if (item.rotation) {
      const currentRot = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
    }

    mergedPdf.addPage(copiedPage);
  }

  return await mergedPdf.save();
}

/**
 * 3. SPLIT PDF
 */
export type SplitMode = 'selected' | 'all' | 'ranges' | 'fixed';

export async function splitPdfDocument(
  pdfBytes: Uint8Array,
  mode: SplitMode,
  params: {
    selectedIndices?: number[]; // 0-based
    rangesText?: string; // e.g. "1-2, 3-5"
    fixedSize?: number; // every N pages
  }
): Promise<{ singlePdf?: Uint8Array; zipBlob?: Blob; count: number; filenames: string[] }> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();

  if (mode === 'selected') {
    // Single PDF containing only the selected pages
    const selected = params.selectedIndices || [];
    if (selected.length === 0) throw new Error('No pages selected to extract');

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, selected);
    copiedPages.forEach((p) => newDoc.addPage(p));
    const outputBytes = await newDoc.save();

    return {
      singlePdf: outputBytes,
      count: 1,
      filenames: [`extracted_pages_${selected.length}.pdf`],
    };
  }

  if (mode === 'all') {
    // Every page is a separate PDF file zipped
    const zip = new JSZip();
    const filenames: string[] = [];

    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const singleBytes = await newDoc.save();
      const filename = `page_${i + 1}.pdf`;
      zip.file(filename, singleBytes);
      filenames.push(filename);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      zipBlob,
      count: totalPages,
      filenames,
    };
  }

  if (mode === 'ranges') {
    // Parse ranges: "1-2, 3-5, 6"
    const text = params.rangesText || '';
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error('Please enter valid page ranges');

    const groups: number[][] = [];
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          throw new Error(`Invalid range: "${part}". Valid pages are 1 to ${totalPages}`);
        }
        const rangeIndices: number[] = [];
        for (let p = start; p <= end; p++) {
          rangeIndices.push(p - 1);
        }
        groups.push(rangeIndices);
      } else {
        const p = parseInt(part, 10);
        if (isNaN(p) || p < 1 || p > totalPages) {
          throw new Error(`Invalid page: "${part}". Valid pages are 1 to ${totalPages}`);
        }
        groups.push([p - 1]);
      }
    }

    if (groups.length === 1) {
      // Just one range - download single PDF
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, groups[0]);
      copiedPages.forEach((p) => newDoc.addPage(p));
      const outputBytes = await newDoc.save();
      return {
        singlePdf: outputBytes,
        count: 1,
        filenames: [`split_range_${parts[0]}.pdf`],
      };
    } else {
      // Multiple ranges - bundle in zip
      const zip = new JSZip();
      const filenames: string[] = [];

      for (let idx = 0; idx < groups.length; idx++) {
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(srcDoc, groups[idx]);
        copiedPages.forEach((p) => newDoc.addPage(p));
        const rangeBytes = await newDoc.save();
        const filename = `range_${parts[idx].replace(/[^0-9-]/g, '_')}.pdf`;
        zip.file(filename, rangeBytes);
        filenames.push(filename);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      return {
        zipBlob,
        count: groups.length,
        filenames,
      };
    }
  }

  throw new Error('Unknown split mode');
}

/**
 * 4. EDIT PDF (APPLY TEXT, DRAWING, HIGHLIGHTS, SHAPES, WHITEOUT, STAMPS, SIGNATURES)
 */
export async function applyAnnotationsToPdf(
  pdfBytes: Uint8Array,
  annotations: Annotation[],
  pageRotations: Record<number, number> = {},
  deletedPageIndices: number[] = []
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  // Embed standard fonts for text
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  // Group annotations by pageIndex
  const annotationsByPage = new Map<number, Annotation[]>();
  for (const ann of annotations) {
    const list = annotationsByPage.get(ann.pageIndex) || [];
    list.push(ann);
    annotationsByPage.set(ann.pageIndex, list);
  }

  // Process pages in order
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    // Check user rotation for this page
    if (pageRotations[i]) {
      const curRot = page.getRotation().angle;
      page.setRotation(degrees((curRot + pageRotations[i]) % 360));
    }

    const pageAnns = annotationsByPage.get(i) || [];

    for (const ann of pageAnns) {
      if (ann.type === 'text') {
        const rgbColor = hexToRgb(ann.color);
        let font = fontHelvetica;
        if (ann.fontFamily === 'Times') font = fontTimes;
        else if (ann.fontFamily === 'Courier') font = fontCourier;
        else if (ann.isBold) font = fontHelveticaBold;

        // In PDF coordinates: (0,0) is bottom-left, canvas is top-left
        const pdfY = height - ann.y - ann.fontSize * 0.8;
        // Clean text to avoid WinAnsi encoding crashes on special characters
        const safeText = (ann.text || '')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[^\x20-\x7E\r\n\t]/g, '');

        page.drawText(safeText, {
          x: Math.max(0, ann.x),
          y: Math.max(0, pdfY),
          size: ann.fontSize || 14,
          font,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        });
      } else if (ann.type === 'whiteout') {
        // Redaction / Whiteout box
        const pdfY = height - ann.y - ann.height;
        const rgbColor = hexToRgb(ann.fillColor || '#ffffff');
        page.drawRectangle({
          x: ann.x,
          y: pdfY,
          width: ann.width,
          height: ann.height,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
          opacity: 1,
        });
      } else if (ann.type === 'rectangle') {
        const pdfY = height - ann.y - ann.height;
        const stroke = hexToRgb(ann.strokeColor || '#2563eb');
        const fill = ann.fillColor ? hexToRgb(ann.fillColor) : undefined;
        page.drawRectangle({
          x: ann.x,
          y: pdfY,
          width: ann.width,
          height: ann.height,
          borderColor: rgb(stroke.r, stroke.g, stroke.b),
          borderWidth: ann.strokeWidth || 2,
          color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
          opacity: ann.opacity ?? 1,
        });
      } else if (ann.type === 'circle') {
        const radius = Math.min(ann.width, ann.height) / 2;
        const centerX = ann.x + radius;
        const centerY = height - (ann.y + radius);
        const stroke = hexToRgb(ann.strokeColor || '#2563eb');
        const fill = ann.fillColor ? hexToRgb(ann.fillColor) : undefined;
        page.drawEllipse({
          x: centerX,
          y: centerY,
          xScale: radius,
          yScale: radius,
          borderColor: rgb(stroke.r, stroke.g, stroke.b),
          borderWidth: ann.strokeWidth || 2,
          color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
          opacity: ann.opacity ?? 1,
        });
      } else if (ann.type === 'line' || ann.type === 'arrow') {
        const pdfY1 = height - ann.y;
        const pdfY2 = height - ann.endY;
        const stroke = hexToRgb(ann.color || '#2563eb');
        page.drawLine({
          start: { x: ann.x, y: pdfY1 },
          end: { x: ann.endX, y: pdfY2 },
          thickness: ann.strokeWidth || 2,
          color: rgb(stroke.r, stroke.g, stroke.b),
        });

        if (ann.type === 'arrow') {
          // Draw arrow head
          const angle = Math.atan2(pdfY2 - pdfY1, ann.endX - ann.x);
          const headLen = 12;
          page.drawLine({
            start: { x: ann.endX, y: pdfY2 },
            end: {
              x: ann.endX - headLen * Math.cos(angle - Math.PI / 6),
              y: pdfY2 - headLen * Math.sin(angle - Math.PI / 6),
            },
            thickness: ann.strokeWidth || 2,
            color: rgb(stroke.r, stroke.g, stroke.b),
          });
          page.drawLine({
            start: { x: ann.endX, y: pdfY2 },
            end: {
              x: ann.endX - headLen * Math.cos(angle + Math.PI / 6),
              y: pdfY2 - headLen * Math.sin(angle + Math.PI / 6),
            },
            thickness: ann.strokeWidth || 2,
            color: rgb(stroke.r, stroke.g, stroke.b),
          });
        }
      } else if (ann.type === 'draw' || ann.type === 'highlighter') {
        if (ann.points && ann.points.length > 1) {
          const stroke = hexToRgb(ann.color || '#eab308');
          const isHighlighter = ann.type === 'highlighter';
          const opacity = isHighlighter ? 0.45 : (ann.opacity ?? 1.0);
          const thickness = isHighlighter ? (ann.strokeWidth || 14) : (ann.strokeWidth || 3);

          for (let pIdx = 0; pIdx < ann.points.length - 1; pIdx++) {
            const pt1 = ann.points[pIdx];
            const pt2 = ann.points[pIdx + 1];
            page.drawLine({
              start: { x: pt1.x, y: height - pt1.y },
              end: { x: pt2.x, y: height - pt2.y },
              thickness,
              color: rgb(stroke.r, stroke.g, stroke.b),
              opacity,
            });
          }
        }
      } else if (ann.type === 'checkmark') {
        // Draw vector checkmark to avoid font encoding errors
        const rgbColor = hexToRgb(ann.color || '#16a34a');
        const size = ann.size || 22;
        const pdfY = height - ann.y;
        const thickness = Math.max(2, size / 8);
        page.drawLine({
          start: { x: ann.x, y: pdfY - size * 0.5 },
          end: { x: ann.x + size * 0.35, y: pdfY - size * 0.85 },
          thickness,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        });
        page.drawLine({
          start: { x: ann.x + size * 0.35, y: pdfY - size * 0.85 },
          end: { x: ann.x + size * 0.9, y: pdfY - size * 0.15 },
          thickness,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        });
      } else if (ann.type === 'cross') {
        // Draw vector cross to avoid font encoding errors
        const rgbColor = hexToRgb(ann.color || '#dc2626');
        const size = ann.size || 22;
        const pdfY = height - ann.y;
        const thickness = Math.max(2, size / 8);
        page.drawLine({
          start: { x: ann.x + size * 0.1, y: pdfY - size * 0.1 },
          end: { x: ann.x + size * 0.9, y: pdfY - size * 0.9 },
          thickness,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        });
        page.drawLine({
          start: { x: ann.x + size * 0.1, y: pdfY - size * 0.9 },
          end: { x: ann.x + size * 0.9, y: pdfY - size * 0.1 },
          thickness,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        });
      } else if (ann.type === 'stamp') {
        const rgbColor = hexToRgb(ann.color || '#16a34a');
        const size = ann.size || 24;
        const pdfY = height - ann.y - size;
        const safeText = (ann.text || '').replace(/[^\x20-\x7E]/g, '');

        page.drawText(safeText, {
          x: ann.x,
          y: pdfY,
          size,
          font: fontHelveticaBold,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        });
      } else if (ann.type === 'image') {
        try {
          const isPng = ann.dataUrl.startsWith('data:image/png');
          const base64Data = ann.dataUrl.split(',')[1];
          const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const embedded = isPng
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);

          const pdfY = height - ann.y - ann.height;
          page.drawImage(embedded, {
            x: ann.x,
            y: pdfY,
            width: ann.width,
            height: ann.height,
          });
        } catch (err) {
          console.error('Failed to embed image annotation:', err);
        }
      }
    }
  }

  // Handle deleted pages if user chose to delete some pages
  if (deletedPageIndices.length > 0 && deletedPageIndices.length < totalPages) {
    // Sort descending so indices stay valid while removing
    const sortedDesc = [...deletedPageIndices].sort((a, b) => b - a);
    for (const idx of sortedDesc) {
      if (idx >= 0 && idx < pdfDoc.getPageCount()) {
        pdfDoc.removePage(idx);
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * 5. RESIZE PDF (PAGE DIMENSIONS, MARGINS, SCALE & ORIENTATION)
 */
export async function resizePdfDocument(
  pdfBytes: Uint8Array,
  options: ResizeOptions
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const outDoc = await PDFDocument.create();
  const totalPages = srcDoc.getPageCount();

  // Determine target dimensions in points
  let targetWidthPt: number;
  let targetHeightPt: number;

  if (options.pageSize === 'Custom' && options.customWidthMm && options.customHeightMm) {
    // 1 mm = 2.83465 points
    targetWidthPt = options.customWidthMm * 2.83465;
    targetHeightPt = options.customHeightMm * 2.83465;
  } else {
    const std = PAGE_SIZES[options.pageSize] || PAGE_SIZES.A4;
    targetWidthPt = std[0];
    targetHeightPt = std[1];
  }

  // Parse page range
  let targetPagesIndices: Set<number>;
  if (options.pageRange === 'all' || !options.pageRange.trim()) {
    targetPagesIndices = new Set(Array.from({ length: totalPages }, (_, i) => i));
  } else {
    targetPagesIndices = new Set();
    const parts = options.pageRange.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [s, e] = part.split('-').map((n) => parseInt(n, 10));
        if (!isNaN(s) && !isNaN(e)) {
          for (let p = Math.max(1, s); p <= Math.min(totalPages, e); p++) {
            targetPagesIndices.add(p - 1);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          targetPagesIndices.add(p - 1);
        }
      }
    }
  }

  for (let i = 0; i < totalPages; i++) {
    const shouldResize = targetPagesIndices.has(i);

    if (!shouldResize) {
      // Keep page as-is
      const [copiedPage] = await outDoc.copyPages(srcDoc, [i]);
      outDoc.addPage(copiedPage);
      continue;
    }

    // Embed the original page as an XObject vector graphic
    const [embeddedPage] = await outDoc.embedPages([srcDoc.getPage(i)]);
    const origW = embeddedPage.width;
    const origH = embeddedPage.height;

    let pageW = targetWidthPt;
    let pageH = targetHeightPt;

    // Apply orientation
    if (options.orientation === 'landscape' || (options.orientation === 'auto' && origW > origH)) {
      if (pageW < pageH) {
        const t = pageW;
        pageW = pageH;
        pageH = t;
      }
    } else if (options.orientation === 'portrait') {
      if (pageW > pageH) {
        const t = pageW;
        pageW = pageH;
        pageH = t;
      }
    }

    const margin = options.marginPt || 0;
    const usableW = Math.max(10, pageW - margin * 2);
    const usableH = Math.max(10, pageH - margin * 2);

    let scale = 1.0;
    if (options.scaleMode === 'fit') {
      scale = Math.min(usableW / origW, usableH / origH);
    } else if (options.scaleMode === 'fill') {
      scale = Math.max(usableW / origW, usableH / origH);
    }

    const drawW = origW * scale;
    const drawH = origH * scale;

    const x = margin + (usableW - drawW) / 2;
    const y = margin + (usableH - drawH) / 2;

    const newPage = outDoc.addPage([pageW, pageH]);
    newPage.drawPage(embeddedPage, {
      x,
      y,
      xScale: scale,
      yScale: scale,
    });
  }

  return await outDoc.save();
}

/**
 * Helper to download Uint8Array or Blob as a file in browser
 */
export function downloadFile(data: Uint8Array | Blob, fileName: string, mimeType = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
