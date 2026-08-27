'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Eye, CheckCircle2 } from 'lucide-react';

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

  const totalPages = asImages.length > 0 ? asImages.length : 2;

  // Find active answer for selected question
  const activeAnswer = answers.find(a => a.questionId === selectedQuestionId);

  // Auto-navigate page & scroll to active answer box when selected question changes
  useEffect(() => {
    if (activeAnswer) {
      if (activeAnswer.page && activeAnswer.page !== currentPage) {
        setCurrentPage(activeAnswer.page);
      }

      // Smooth scroll to active box
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

  // Helper to map question id to badge label
  const getQuestionLabel = (qId) => {
    const q = questions.find(item => item.id === qId);
    if (!q) return 'Answer';
    return `Q${q.qNo}${q.subPart ? q.subPart : ''}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden text-white">
      
      {/* Header Bar */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-500" />
          <h3 className="font-extrabold text-xs sm:text-sm text-white">
            Student Answer Sheet
          </h3>
          <span className="bg-slate-800 text-slate-400 text-[11px] px-2 py-0.5 rounded-md font-mono">
            Ruled Notebook Paper
          </span>
        </div>

        {/* Controls: Zoom & Page Navigator */}
        <div className="flex items-center gap-4">
          {/* Zoom */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setZoom(prev => Math.max(70, prev - 15))}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono text-[11px] font-bold">{zoom}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(160, prev + 15))}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Navigator */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-40 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-bold text-slate-300">
              Page <span className="text-white font-black">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-40 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas / Viewer Scroll Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex justify-center items-start"
      >
        <div 
          className="relative transition-all duration-200 shadow-2xl rounded-lg overflow-hidden bg-white"
          style={{
            width: `${Math.round(680 * (zoom / 100))}px`,
            minHeight: `${Math.round(880 * (zoom / 100))}px`
          }}
        >
          {/* Custom SVG Ruled Notebook Sheet Background (or uploaded image) */}
          {asImages[currentPage - 1]?.base64 ? (
            <img
              src={asImages[currentPage - 1].base64}
              alt={`Answer Sheet Page ${currentPage}`}
              className="w-full h-auto block select-none pointer-events-none"
            />
          ) : (
            /* Styled High-Fidelity Handwritten Notebook Canvas Simulation */
            <div className="w-full h-full min-h-[880px] bg-[#FFFDF8] relative p-8 font-serif leading-relaxed select-none">
              
              {/* Notebook Red Margin Line */}
              <div className="absolute top-0 bottom-0 left-12 w-[2px] bg-red-300 z-0"></div>
              
              {/* Ruled Horizontal Blue Lines */}
              <div 
                className="absolute inset-0 z-0 pointer-events-none" 
                style={{
                  backgroundImage: 'linear-gradient(to bottom, transparent 31px, #E2E8F0 32px)',
                  backgroundSize: '100% 32px'
                }}
              ></div>

              {/* Handwritten Content (Page 1 vs Page 2) */}
              <div className="relative z-10 pl-8 pr-4 pt-4 text-slate-800 text-sm font-medium tracking-wide">
                {currentPage === 1 ? (
                  <>
                    <div className="text-right text-xs font-bold text-slate-500 mb-4">
                      Date: August 2026 • Roll No: 1024
                    </div>

                    {/* Handwritten Answer 2 */}
                    <div className="mb-14 pt-2">
                      <p className="font-bold text-blue-900 text-base mb-1 font-sans">Ans 2:</p>
                      <p className="text-blue-800 text-sm italic font-serif leading-loose">
                        The organelle responsible for photosynthesis in plant cells is the Chloroplast.
                        The primary pigment inside chloroplasts is Chlorophyll, which captures sunlight to convert CO₂ and water into glucose.
                      </p>
                    </div>

                    {/* Handwritten Answer 1 */}
                    <div className="mb-14 pt-2">
                      <p className="font-bold text-blue-900 text-base mb-1 font-sans">Ans 1:</p>
                      <p className="text-blue-800 text-sm italic font-serif leading-loose">
                        Photosynthesis is the biological process by which green plants manufacture food (glucose) using carbon dioxide, water, and sunlight energy.
                        <br />
                        Balanced Chemical Equation:
                        <br />
                        <span className="font-mono text-xs font-bold text-blue-950 bg-blue-50/80 px-2 py-1 rounded">
                          6CO₂ + 6H₂O  ──[ Sunlight + Chlorophyll ]──❯  C₆H₁₂O₆ + 6O₂
                        </span>
                      </p>
                    </div>

                    {/* Handwritten Answer 3 */}
                    <div className="pt-2">
                      <p className="font-bold text-blue-900 text-base mb-1 font-sans">Ans 3:</p>
                      <p className="text-blue-800 text-sm italic font-serif leading-loose">
                        Ohm's Law states that the current (I) flowing through a conductor is directly proportional to potential difference (V) across its ends, provided temperature remains constant.
                        <br />
                        Mathematical Formula: V = I × R
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-right text-xs font-bold text-slate-500 mb-4">
                      Page 2 • Roll No: 1024
                    </div>

                    {/* Handwritten Answer 4 */}
                    <div className="mb-16 pt-2">
                      <p className="font-bold text-blue-900 text-base mb-1 font-sans">Ans 4:</p>
                      <p className="text-blue-800 text-sm italic font-serif leading-loose">
                        Given: R₁ = 4Ω, R₂ = 6Ω
                        <br />
                        (i) Series Connection: R_total = R₁ + R₂ = 4 + 6 = 10 Ω
                        <br />
                        (ii) Parallel Connection: 1/R_total = 1/R₁ + 1/R₂ = 1/4 + 1/6 = 5/12
                        <br />
                        ∴ R_total = 12/5 = 2.4 Ω
                      </p>
                    </div>

                    {/* Handwritten Answer 5(a) */}
                    <div className="mb-16 pt-2">
                      <p className="font-bold text-blue-900 text-base mb-1 font-sans">Ans 5(a):</p>
                      <p className="text-blue-800 text-sm italic font-serif leading-loose">
                        Carbohydrate digestion begins in the buccal cavity where salivary amylase breaks down complex starch into simple sugars (maltose).
                        Final breakdown occurs in the small intestine via pancreatic amylase into glucose.
                      </p>
                    </div>

                    {/* Rough Work */}
                    <div className="pt-8 opacity-70">
                      <p className="font-bold text-slate-400 text-xs font-sans uppercase tracking-widest">
                        Rough Work / Scratch Notes:
                      </p>
                      <p className="text-slate-500 text-xs italic font-serif">
                        V = 12, I = 2 ⇒ R = 6 Ohms. (Calculations)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SVG Overlay Layer for Bounding Box Highlights */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {answersForCurrentPage.map((ans) => {
              const isSelected = selectedQuestionId === ans.questionId;
              const isUnmatched = ans.status === 'unmatched';
              const label = getQuestionLabel(ans.questionId);

              // Percentage coordinates [ymin, xmin, ymax, xmax]
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
                  className={`absolute rounded-xl transition-all duration-300 pointer-events-auto cursor-pointer flex flex-col justify-between p-2 ${
                    isSelected
                      ? 'border-3 border-brand-500 bg-brand-500/15 shadow-xl ring-4 ring-brand-500/30'
                      : isUnmatched
                      ? 'border-2 border-dashed border-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                      : 'border-2 border-emerald-500/60 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/15'
                  }`}
                >
                  {/* Bounding Box Tag Badge (e.g. Q2) */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black shadow-md flex items-center gap-1 ${
                      isSelected
                        ? 'bg-brand-500 text-white animate-pulse'
                        : isUnmatched
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {label}
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-brand-100 text-brand-700 font-extrabold'
                        : 'bg-white/80 text-slate-700 backdrop-blur-sm'
                    }`}>
                      {ans.marks !== undefined ? `${ans.marks}/${ans.maxMarks} Marks` : 'Detected'}
                    </span>
                  </div>

                  {/* Micro Hint */}
                  {isSelected && (
                    <div className="text-right">
                      <span className="bg-slate-900/90 text-white text-[10px] px-2 py-0.5 rounded font-semibold backdrop-blur-sm">
                        Selected Region
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
}
