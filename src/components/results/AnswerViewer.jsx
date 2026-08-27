'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

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

  const totalPages = asImages.length > 0 ? asImages.length : 4;

  const activeAnswer = answers.find(a => a.questionId === selectedQuestionId);

  useEffect(() => {
    if (activeAnswer) {
      if (activeAnswer.page && activeAnswer.page !== currentPage) {
        setCurrentPage(activeAnswer.page);
      }

      setTimeout(() => {
        if (activeBoxRef.current) {
          activeBoxRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
    }
  }, [selectedQuestionId, activeAnswer]);

  const answersForCurrentPage = answers.filter(a => a.page === currentPage);

  const getQuestionLabel = (qId) => {
    const q = questions.find(item => item.id === qId);
    if (!q) return 'Answer';
    return `Q${q.qNo}${q.subPart ? q.subPart : ''}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-3xl border border-slate-700/80 shadow-md overflow-hidden text-white">
      
      {/* Header Bar matching Screenshot 2 */}
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
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold text-slate-200">{zoom}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(160, prev + 15))}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Navigator matching Screenshot 2 */}
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
          {asImages[currentPage - 1]?.base64 ? (
            <img
              src={asImages[currentPage - 1].base64}
              alt={`Answer Sheet Page ${currentPage}`}
              className="w-full h-auto block select-none pointer-events-none"
            />
          ) : (
            /* Styled Ruled Notebook Sheet matching Screenshot 2 */
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

              {/* Handwritten Blue Pen Answers & Diagram matching Screenshot 2 */}
              <div className="relative z-10 pl-6 pr-4 pt-2 font-serif text-slate-800 text-sm leading-[32px]">
                
                {/* Q1 Handwritten Answer Block */}
                <div className="mb-6">
                  <span className="font-bold text-blue-900 text-base font-sans mr-2">Q1.</span>
                  <span className="text-blue-900 font-serif italic text-base">
                    Photosynthesis is the process used by green plants and some other organisms to convert light energy into chemical energy.
                  </span>

                  {/* Chemical Equation Box */}
                  <div className="my-3 mx-auto w-11/12 border border-slate-700 py-1.5 px-4 text-center font-serif text-blue-900 text-sm font-bold bg-white/40 rounded-sm">
                    6CO₂ + 6H₂O ───[ Light / Chlorophyll ]───❯ C₆H₁₂O₆ + 6O₂
                  </div>

                  {/* Plant Ray Diagram Graphic */}
                  <div className="my-4 flex flex-col items-center justify-center text-blue-900 font-serif text-xs">
                    {/* Sun */}
                    <div className="flex items-center gap-1 mb-1 font-bold">
                      <span>☀️ Sunlight</span>
                    </div>

                    {/* Plant Graphic */}
                    <div className="border border-slate-400 p-4 bg-white/30 rounded-sm text-center relative w-64">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Carbon dioxide ──❯</span>
                        <span>🌱</span>
                        <span>──❯ Oxygen</span>
                      </div>
                      <div className="mt-4 pt-2 border-t border-dashed border-slate-400 text-center font-bold text-[11px]">
                        🌊 Water (Roots)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Q2 Handwritten Answer Block matching Screenshot 2 */}
                <div className="my-8 pt-2">
                  <span className="font-bold text-blue-900 text-base font-sans mr-2">Q2.</span>
                  <p className="text-blue-900 font-serif italic text-base leading-[32px]">
                    The process mainly occurs in the chloroplast of the plant cell. It has two main stages:
                  </p>
                  <p className="text-blue-900 font-serif italic text-base leading-[32px] pl-6">
                    1. Light reaction – Captures light energy.
                  </p>
                  <p className="text-blue-900 font-serif italic text-base leading-[32px] pl-6">
                    2. Dark reaction – Uses energy to make glucose.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* SVG Overlay Layer for Bounding Box Highlights matching Screenshot 2 */}
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
                  key={ans.id}
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
                  {/* Q2 Green Tag Badge matching Screenshot 2 */}
                  <div className="absolute -top-3 left-2">
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
