/**
 * PDF & Image file → page images converter
 * Converts uploaded files (PDF or image) into an array of compressed {page, base64} objects
 * for feeding into the Gemini Vision pipeline without triggering payload limit errors.
 */

/**
 * Resize and compress an HTML Image or Canvas element to a lightweight JPEG base64 string.
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
    console.warn('[pdfUtils] No file provided');
    return [];
  }

  console.log(`[pdfUtils] Processing file: "${file.name}" (${file.type}, ${(file.size / 1024).toFixed(1)} KB)`);

  // ─── Image files: read & compress ─────────────────────────────────────────
  if (file.type.startsWith('image/')) {
    console.log('[pdfUtils] File is an image — compressing and converting');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const base64 = compressToJpeg(img, 1600, 0.8);
          console.log(`[pdfUtils] ✅ Image compressed: ${(base64.length / 1024).toFixed(0)} KB base64`);
          resolve([{ page: 1, base64 }]);
        };
        img.onerror = (err) => {
          console.warn('[pdfUtils] Failed to load image element, fallback to raw base64');
          resolve([{ page: 1, base64: e.target.result }]);
        };
        img.src = e.target.result;
      };
      reader.onerror = (err) => {
        console.error('[pdfUtils] ❌ FileReader error:', err);
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }

  // ─── PDF files: render each page to canvas & compress to JPEG ────────────
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    console.log('[pdfUtils] File is a PDF — rendering pages to compressed images');

    try {
      if (typeof window === 'undefined') {
        console.error('[pdfUtils] ❌ Cannot render PDF on server side');
        return [];
      }

      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      // Set the worker source — use bundled worker from pdfjs-dist
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        console.log(`[pdfUtils] Set PDF.js worker to v${pdfjsLib.version}`);
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log(`[pdfUtils] ArrayBuffer size: ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`);

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      console.log(`[pdfUtils] PDF loaded: ${numPages} page(s)`);

      const pageImages = [];
      const RENDER_SCALE = 1.8; // High readability scale

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
          console.log(`[pdfUtils] ✅ Page ${i}/${numPages}: ${viewport.width}x${viewport.height}px → ${(base64.length / 1024).toFixed(0)} KB base64`);

          canvas.width = 0;
          canvas.height = 0;
        } catch (pageErr) {
          console.error(`[pdfUtils] ❌ Failed to render page ${i}:`, pageErr);
        }
      }

      if (pageImages.length === 0) {
        console.error('[pdfUtils] ❌ No pages were rendered successfully');
      } else {
        console.log(`[pdfUtils] ✅ Total: ${pageImages.length}/${numPages} pages rendered`);
      }

      return pageImages;

    } catch (err) {
      console.error('[pdfUtils] ❌ PDF processing failed:', err);

      console.log('[pdfUtils] Attempting generic FileReader fallback...');
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
  console.warn(`[pdfUtils] ⚠ Unknown file type: ${file.type}. Attempting generic read.`);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve([{ page: 1, base64: e.target.result }]);
    reader.onerror = () => resolve([]);
    reader.readAsDataURL(file);
  });
}
