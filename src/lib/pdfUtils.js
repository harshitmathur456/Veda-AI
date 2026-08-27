/**
 * Helper utility to read uploaded File (PDF or Image) and convert to image data URLs
 */

export async function convertFileToImages(file) {
  if (!file) return [];

  // If already an image file (PNG, JPG, WEBP)
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve([{ page: 1, base64: e.target.result }]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // If PDF file, use client-side Canvas rendering or fallback image generator
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    try {
      if (typeof window !== 'undefined') {
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker location
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageImages = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;
          pageImages.push({
            page: i,
            base64: canvas.toDataURL('image/png')
          });
        }
        return pageImages;
      }
    } catch (err) {
      console.warn("Client-side PDF rendering fallback:", err);
    }
  }

  // Generic FileReader fallback
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve([{ page: 1, base64: e.target.result }]);
    reader.readAsDataURL(file);
  });
}
