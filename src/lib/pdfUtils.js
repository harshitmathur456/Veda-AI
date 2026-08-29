/**
 * PDF & Image file → page images converter
 * Converts uploaded files (PDF or image) into an array of compressed {page, base64} objects
 * for feeding into the Gemini Vision pipeline and rendering directly in AnswerViewer.
 */

/**
 * Resize and compress an HTML Image or Canvas element to a lightweight JPEG base64 string.
 * Uses canvas downscaling to keep payload sizes manageable for the Gemini API.
 * @param {HTMLImageElement | HTMLCanvasElement} source 
 * @param {number} maxDim - Maximum width or height in pixels
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @returns {string} JPEG Base64 Data URL
 */
function compressToJpeg(source, maxDim = 1600, quality = 0.85) {
  const canvas = document.createElement('canvas');
  let width = source.width || source.naturalWidth || 1000;
  let height = source.height || source.naturalHeight || 1000;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Fill white background before drawing to avoid black background on transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Convert an uploaded File (PDF or Image) to an array of page image data URLs.
 * @param {File} file - The uploaded file
 * @returns {Promise<Array<{page: number, base64: string}>>}
 */
export async function convertFileToImages(file) {
  if (!file) {
    return [];
  }

  console.log(`[pdfUtils] Converting file: ${file.name} (${(file.size / 1024).toFixed(1)} KB, type: ${file.type})`);

  // ─── Image files: read & compress ─────────────────────────────────────────
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const base64 = compressToJpeg(img, 1600, 0.85);
          console.log(`[pdfUtils] Image converted to JPEG data URL (${(base64.length / 1024).toFixed(1)} KB)`);
          resolve([{ page: 1, base64 }]);
        };
        img.onerror = () => {
          console.warn('[pdfUtils] Image element load failed, using raw data URL');
          resolve([{ page: 1, base64: e.target.result }]);
        };
        img.src = e.target.result;
      };
      reader.onerror = (err) => {
        console.error('[pdfUtils] FileReader error:', err);
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }

  // ─── PDF files: render each page to canvas & compress to JPEG ────────────
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      if (typeof window === 'undefined') {
        console.error('[pdfUtils] Cannot render PDF on server side');
        return [];
      }

      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      const version = pdfjsLib.version || '4.10.38';
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await file.arrayBuffer();

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${version}/standard_fonts/`,
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      console.log(`[pdfUtils] PDF loaded: ${file.name}, total pages = ${numPages}`);

      const pageImages = [];
      const RENDER_SCALE = 2.0; // Sharp resolution for handwriting recognition

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          // White background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: ctx,
            viewport: viewport,
          }).promise;

          // Compress canvas output to optimized JPEG Data URL
          const base64 = compressToJpeg(canvas, 1600, 0.85);
          console.log(`[pdfUtils] Rendered page ${i}/${numPages} (${(base64.length / 1024).toFixed(1)} KB JPEG)`);

          pageImages.push({ page: i, base64 });

          // Free memory
          canvas.width = 0;
          canvas.height = 0;
        } catch (pageErr) {
          console.error(`[pdfUtils] Failed to render page ${i}:`, pageErr);
        }
      }

      if (pageImages.length > 0) {
        console.log(`[pdfUtils] ✓ Successfully rasterized ${pageImages.length} page images from PDF`);
        return pageImages;
      }

      throw new Error('No pages could be rendered from PDF');

    } catch (err) {
      console.error('[pdfUtils] PDF canvas rasterization failed, falling back to raw data URL:', err);

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve([{ page: 1, base64: e.target.result }]);
        };
        reader.onerror = () => resolve([]);
        reader.readAsDataURL(file);
      });
    }
  }

  // ─── Unknown file types: generic read ─────────────────────────────────────
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve([{ page: 1, base64: e.target.result }]);
    reader.onerror = () => resolve([]);
    reader.readAsDataURL(file);
  });
}

/**
 * Extract digital text layer from a PDF file if present.
 * Returns the extracted text string if > 50 characters, or null if scanned / image-only.
 * @param {File} file
 * @returns {Promise<string|null>}
 */
export async function extractDigitalTextFromPDF(file) {
  if (!file || (file.type !== 'application/pdf' && !file.name?.toLowerCase().endsWith('.pdf'))) {
    return null;
  }
  try {
    if (typeof window === 'undefined') return null;
    const pdfjsLib = await import('pdfjs-dist');
    const version = pdfjsLib.version || '4.10.38';
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${version}/standard_fonts/`,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      if (pageText.trim()) {
        fullText += `--- Page ${i} ---\n${pageText}\n`;
      }
    }

    const clean = fullText.replace(/\s+/g, ' ').trim();
    if (clean.length > 50) {
      console.log(`[pdfUtils] ✓ Digital PDF text layer detected (${clean.length} chars)`);
      return fullText;
    }
  } catch (err) {
    console.warn('[pdfUtils] Digital PDF text extraction failed, falling back to vision:', err);
  }
  return null;
}
