/**
 * PDF & Image file → page images converter
 * Converts uploaded files (PDF or image) into an array of {page, base64} objects
 * for feeding into the Gemini Vision pipeline.
 */

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

  // ─── Image files: direct read ─────────────────────────────────────────
  if (file.type.startsWith('image/')) {
    console.log('[pdfUtils] File is an image — reading directly');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        console.log(`[pdfUtils] ✅ Image loaded: ${(base64.length / 1024).toFixed(0)} KB base64`);
        resolve([{ page: 1, base64 }]);
      };
      reader.onerror = (err) => {
        console.error('[pdfUtils] ❌ FileReader error:', err);
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }

  // ─── PDF files: render each page to canvas ────────────────────────────
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    console.log('[pdfUtils] File is a PDF — rendering pages to images');

    try {
      if (typeof window === 'undefined') {
        console.error('[pdfUtils] ❌ Cannot render PDF on server side');
        return [];
      }

      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      // Set the worker source — use the bundled worker from node_modules
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        console.log(`[pdfUtils] Set PDF.js worker to CDN v${pdfjsLib.version}`);
      }

      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log(`[pdfUtils] ArrayBuffer size: ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`);

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      console.log(`[pdfUtils] PDF loaded: ${numPages} page(s)`);

      const pageImages = [];
      const RENDER_SCALE = 2.0; // Higher scale = better OCR quality

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          // Create an offscreen canvas
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          // Render the page
          await page.render({
            canvasContext: ctx,
            viewport: viewport,
          }).promise;

          // Convert to JPEG for smaller payload (3-5x smaller than PNG, still good for OCR)
          const base64 = canvas.toDataURL('image/jpeg', 0.85);

          pageImages.push({ page: i, base64 });
          console.log(`[pdfUtils] ✅ Page ${i}/${numPages}: ${viewport.width}x${viewport.height}px → ${(base64.length / 1024).toFixed(0)} KB base64`);

          // Clean up canvas
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

      // Fallback: try reading as generic file
      console.log('[pdfUtils] Attempting generic FileReader fallback...');
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('[pdfUtils] ⚠ Fallback: read as raw data URL (may not work for Gemini)');
          resolve([{ page: 1, base64: e.target.result }]);
        };
        reader.onerror = () => {
          console.error('[pdfUtils] ❌ Fallback FileReader also failed');
          resolve([]);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  // ─── Unknown file types: try generic read ─────────────────────────────
  console.warn(`[pdfUtils] ⚠ Unknown file type: ${file.type}. Attempting generic read.`);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve([{ page: 1, base64: e.target.result }]);
    reader.onerror = () => resolve([]);
    reader.readAsDataURL(file);
  });
}
