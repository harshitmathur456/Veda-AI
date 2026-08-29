'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CheckCircle2, FileQuestion } from 'lucide-react';

/**
 * Renders an answer sheet page either as an image or by rendering a raw PDF to canvas.
 */
function AnswerPageImage({ pageData, pageNumber }) {
  const [pdfRenderedUrl, setPdfRenderedUrl] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const canvasRef = useRef(null);

  const rawBase64 = pageData?.base64 || '';
  const isPdfDataUrl = rawBase64.startsWith('data:application/pdf');
  const isImageDataUrl = rawBase64.startsWith('data:image/');

  useEffect(() => {
    // If the data is a raw PDF URL, dynamically render it to canvas using pdfjs-dist
    if (isPdfDataUrl && typeof window !== 'undefined') {
      let isCancelled = false;

      async function renderPdfPage() {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          const version = pdfjsLib.version || '4.10.38';
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
          }

          const base64Data = rawBase64.replace(/^data:application\/pdf;base64,/, '');
          const binaryStr = window.atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const pdf = await pdfjsLib.getDocument({ data: bytes, useSystemFonts: true }).promise;
          const targetPage = Math.min(pageNumber, pdf.numPages);
          const page = await pdf.getPage(targetPage);
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: ctx, viewport }).promise;

          if (!isCancelled) {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setPdfRenderedUrl(dataUrl);
          }
        } catch (e) {
          console.error('[AnswerViewer] PDF-to-canvas rendering failed:', e);
          if (!isCancelled) setLoadError(true);
        }
      }

      renderPdfPage();
      return () => { isCancelled = true; };
    }
  }, [rawBase64, isPdfDataUrl, pageNumber]);

  const activeSrc = isImageDataUrl ? rawBase64 : pdfRenderedUrl;

  if (activeSrc && !loadError) {
    return (
      <img
        src={activeSrc}
        alt={`Answer Sheet Page ${pageNumber}`}
        className="w-full h-auto block select-none pointer-events-none"
        onLoad={(e) => {
          console.log(`[AnswerViewer] Page ${pageNumber} image loaded:`, e.target.naturalWidth, 'x', e.target.naturalHeight);
        }}
        onError={(e) => {
          console.error(`[AnswerViewer] Page ${pageNumber} image failed to load:`, e);
          setLoadError(true);
        }}
      />
    );
  }

  // Fallback: Styled Ruled Notebook Sheet
  return (
    <div className="w-full h-full min-h-[860px] bg-[#FAF8F5] relative p-8 select-none">
      {/* Double Red Left Margin Line */}
      <div className="absolute top-0 bottom-0 left-10 w-[1px] bg-rose-300 z-0"></div>
      <div className="absolute top-0 bottom-0 left-11 w-[1px] bg-rose-300 z-0"></div>

      {/* Ruled Horizontal Lines */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(to bottom, transparent 31px, #CBD5E1 32px)',
          backgroundSize: '100% 32px'
        }}
      ></div>

      <div className="relative z-10 pl-6 pr-4 pt-2 font-serif text-slate-800 text-sm leading-[32px]">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <FileQuestion className="w-10 h-10 mb-2 opacity-50" />
          <p className="font-sans text-xs font-bold text-slate-500">Page {pageNumber} Content</p>
        </div>
      </div>
    </div>
  );
}

export default function AnswerViewer({
  answers = [],
  questions = [],
  selectedQuestionId,
  onSelectAnswer,
  asImages = []
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef(null);
  const activeBoxRef = useRef(null);

  const totalPages = asImages.length > 0 ? asImages.length : 1;

  const activeAnswer = answers.find(a => a.questionId === selectedQuestionId);

  useEffect(() => {
    if (activeAnswer) {
      if (activeAnswer.page && activeAnswer.page !== currentPage && activeAnswer.page <= totalPages) {
        setCurrentPage(activeAnswer.page);
      }

      setTimeout(() => {
        if (activeBoxRef.current) {
          activeBoxRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 150);
    }
  }, [selectedQuestionId, activeAnswer, totalPages]);

  const answersForCurrentPage = answers.filter(a => a.page === currentPage && a.bbox);

  const getQuestionLabel = useCallback((qId) => {
    const q = questions.find(item => item.id === qId);
    if (!q) return qId?.toUpperCase() || 'Ans';
    return `Q${q.qNo}${q.subPart ? q.subPart : ''}`;
  }, [questions]);

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-3xl border border-slate-700/80 shadow-md overflow-hidden text-white">
      
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-extrabold text-xs sm:text-sm text-white pl-2">
          Answer Sheet
        </h3>

        {/* Controls: Zoom & Page Navigator */}
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full text-xs">
            <button
              onClick={() => setZoom(prev => Math.max(70, prev - 15))}
              className="text-slate-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold text-slate-200">{zoom}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(160, prev + 15))}
              className="text-slate-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Navigator */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-bold text-slate-200">
              Page <span className="text-white font-extrabold">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 bg-slate-900 flex justify-center items-start"
      >
        <div 
          className="relative transition-all duration-200 shadow-2xl rounded-sm overflow-hidden bg-white"
          style={{
            width: `${Math.round(640 * (zoom / 100))}px`,
            minHeight: `${Math.round(860 * (zoom / 100))}px`
          }}
        >
          {/* Answer Sheet Page Image Component */}
          <AnswerPageImage
            pageData={asImages[currentPage - 1]}
            pageNumber={currentPage}
          />

          {/* Highlight Overlay Layer for Bounding Boxes */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {answersForCurrentPage.map((ans) => {
              const isSelected = selectedQuestionId === ans.questionId;
              const label = getQuestionLabel(ans.questionId);

              const top = `${ans.bbox.ymin}%`;
              const left = `${ans.bbox.xmin}%`;
              const height = `${ans.bbox.ymax - ans.bbox.ymin}%`;
              const width = `${ans.bbox.xmax - ans.bbox.xmin}%`;

              return (
                <div
                  key={ans.id || ans.questionId}
                  ref={isSelected ? activeBoxRef : null}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (ans.questionId) onSelectAnswer(ans.questionId);
                  }}
                  style={{ top, left, height, width }}
                  className={`absolute rounded-xl transition-all duration-300 pointer-events-auto cursor-pointer p-1.5 ${
                    isSelected
                      ? 'border-2 border-[#22C55E] bg-[#22C55E]/10 shadow-lg ring-2 ring-[#22C55E]/20'
                      : 'border-2 border-emerald-500/60 bg-emerald-500/5 hover:border-emerald-500'
                  }`}
                >
                  {/* Tag Badge */}
                  <div className="absolute -top-3 left-2 z-30">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-[#22C55E] text-white shadow-md flex items-center gap-1">
                      {label}
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
}
