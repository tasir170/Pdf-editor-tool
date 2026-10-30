import * as pdfjsLib from 'pdfjs-dist';
// Import local worker via Vite ?url so it is bundled locally with zero network dependency
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (e) {
    console.error('Failed to configure PDF.js worker:', e);
  }
}

export interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Loads a PDF from Uint8Array or ArrayBuffer and renders thumbnail images for all pages.
 */
export async function renderPdfPages(
  pdfData: ArrayBuffer | Uint8Array,
  scale = 1.0,
  maxPages = 100
): Promise<{ pages: RenderedPage[]; numPages: number; title?: string }> {
  // Always clone buffer to prevent detaching when transferred to Web Worker
  const bufferCopy = pdfData instanceof Uint8Array ? pdfData.slice().buffer : pdfData.slice(0);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bufferCopy),
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pagesToRender = Math.min(numPages, maxPages);
  const pages: RenderedPage[] = [];

  for (let i = 1; i <= pagesToRender; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    pages.push({
      pageNumber: i,
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.width / viewport.height,
    });
  }

  let title = '';
  try {
    const metadata = await pdf.getMetadata();
    if (metadata?.info && typeof metadata.info === 'object' && 'Title' in metadata.info) {
      title = String((metadata.info as { Title?: string }).Title || '');
    }
  } catch {
    // Ignore metadata error
  }

  return { pages, numPages, title };
}

export interface ExtractedPdfTextItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: 'Helvetica' | 'Times' | 'Courier';
  isBold: boolean;
  isItalic: boolean;
  color?: string;
}

/**
 * Render a single page at high resolution for editing canvas
 */
export async function renderSinglePageHiRes(
  pdfData: ArrayBuffer | Uint8Array,
  pageNumber: number,
  scale = 2.0
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  unscaledWidth: number;
  unscaledHeight: number;
  extractedTextItems: ExtractedPdfTextItem[];
}> {
  // Always clone buffer to prevent detaching when transferred to Web Worker
  const bufferCopy = pdfData instanceof Uint8Array ? pdfData.slice().buffer : pdfData.slice(0);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bufferCopy),
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;

  const extractedTextItems: ExtractedPdfTextItem[] = [];
  try {
    const textContent = await page.getTextContent();
    for (let idx = 0; idx < textContent.items.length; idx++) {
      const item = textContent.items[idx];
      if ('str' in item && typeof item.str === 'string' && item.str.trim()) {
        const tx = item.transform[4];
        const ty = item.transform[5];

        // In PDF transformation matrices:
        // transform is [scaleX * cos, scaleX * sin, -scaleY * sin, scaleY * cos, tx, ty]
        // The vertical font size in points is hypot(transform[2], transform[3]) or hypot(transform[0], transform[1])
        const scaleY = Math.hypot(item.transform[2], item.transform[3]);
        const scaleX = Math.hypot(item.transform[0], item.transform[1]);
        const calculatedSize = scaleY > 0 ? scaleY : scaleX;
        // Keep 1 decimal place of precision (e.g. 10.5, 11, 12, 14.4)
        const fontSize = Math.max(6, Math.round(calculatedSize * 10) / 10);

        const w = Math.max(15, item.width || fontSize * item.str.length * 0.6);
        const h = Math.max(fontSize, item.height || fontSize);
        const x = tx;
        const y = unscaledViewport.height - ty - fontSize * 0.85;

        // Detect font family, bold, and italic from PDF.js font descriptor and style
        const fontName = item.fontName || '';
        const style = textContent.styles && fontName ? textContent.styles[fontName] : null;
        const styleFamily = style?.fontFamily || '';
        const combinedFontInfo = `${fontName} ${styleFamily}`.toLowerCase();

        // Check for Monospace (Courier, etc.)
        const isMono = /courier|mono|consolas|menlo|fixed|typewriter|source\s*code/i.test(combinedFontInfo);
        // Check for Serif (Times New Roman, Georgia, etc.)
        const isSerif = !isMono && /times|roman|georgia|serif|cambria|garamond|minion|baskerville|palatino|century|bookman/i.test(combinedFontInfo);
        const fontFamily: 'Helvetica' | 'Times' | 'Courier' = isMono ? 'Courier' : isSerif ? 'Times' : 'Helvetica';

        // Check for Bold
        const isBold = /bold|black|heavy|medium|demi|w[7-9]|semibold/i.test(combinedFontInfo);
        // Check for Italic / Oblique
        const isItalic = /italic|oblique|slanted/i.test(combinedFontInfo);

        extractedTextItems.push({
          id: `raw-text-${pageNumber}-${idx}`,
          str: item.str,
          x,
          y,
          width: w,
          height: h,
          fontSize,
          fontFamily,
          isBold,
          isItalic,
          color: '#0f172a',
        });
      }
    }
  } catch (err) {
    console.warn('Could not extract text content:', err);
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
    unscaledWidth: unscaledViewport.width,
    unscaledHeight: unscaledViewport.height,
    extractedTextItems,
  };
}
