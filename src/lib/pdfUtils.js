/**
 * PDF & Image file → page images converter
 * Converts uploaded files (PDF or image) into an array of compressed {page, base64} objects
 * for feeding into the Gemini Vision pipeline without triggering payload limit errors.
 */

/**
 * Resize and compress an HTML Image or Canvas element to a lightweight JPEG base64 string.
 * Uses canvas downscaling to keep payload sizes manageable for the Gemini API.
 * @param {HTMLImageElement | HTMLCanvasElement} source 
 * @param {number} maxDim - Maximum width or height in pixels
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @returns {string} JPEG Base64 Data URL
 */
function compressToJpeg(source, maxDim = 1600, quality = 0.8) {
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

  // ─── Image files: read & compress ─────────────────────────────────────────
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const base64 = compressToJpeg(img, 1600, 0.8);
          resolve([{ page: 1, base64 }]);
        };
        img.onerror = () => {
          // Fallback to raw base64 if the image element fails to load
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

      // Dynamic import of pdfjs-dist to keep initial bundle size small
      const pdfjsLib = await import('pdfjs-dist');

      // Set the worker source — use bundled worker from pdfjs-dist CDN
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await file.arrayBuffer();

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const pageImages = [];
      // Scale factor chosen to balance readability vs. base64 payload size
      const RENDER_SCALE = 1.8;

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await page.render({
            canvasContext: ctx,
            viewport: viewport,
          }).promise;

          // Compress canvas output to optimized JPEG
          const base64 = compressToJpeg(canvas, 1600, 0.8);

          pageImages.push({ page: i, base64 });

          // Release canvas memory immediately after encoding
          canvas.width = 0;
          canvas.height = 0;
        } catch (pageErr) {
          console.error(`[pdfUtils] Failed to render page ${i}:`, pageErr);
        }
      }

      if (pageImages.length === 0) {
        console.error('[pdfUtils] No pages were rendered successfully');
      }

      return pageImages;

    } catch (err) {
      console.error('[pdfUtils] PDF processing failed:', err);

      // Fallback: read the raw file as a single data URL
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
