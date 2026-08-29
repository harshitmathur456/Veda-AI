'use client';

import React from 'react';

export default function ProcessingView({
  progress = { stage: 1, text: 'Extracting...' },
  error = null,
  onRetry = null,
  onNewUpload = null,
}) {
  const errStr = String(error || '').toLowerCase();
  const isQuotaError =
    errStr.includes('429') ||
    errStr.includes('quota') ||
    errStr.includes('resource_exhausted') ||
    errStr.includes('rate limit') ||
    errStr.includes('too many tokens') ||
    errStr.includes('too many requests') ||
    errStr.includes('exceeded') ||
    errStr.includes('generativelanguage') ||
    errStr.includes('free_tier');

  const displayError = isQuotaError ? 'Too many tokens used try again later' : error;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-100">
      
      {/* Large Centered White Rounded Container */}
      <div className="w-full max-w-4xl min-h-[500px] bg-white rounded-3xl p-12 shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center">
        
        {hasError ? (
          /* ─── Error State ─── */
          <>
            {/* Error Icon */}
            <div className="relative mb-6 w-24 h-24 flex items-center justify-center">
              <svg className="w-16 h-16 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
              Evaluation Failed
            </h2>
            
            <p className="text-sm font-medium text-slate-500 max-w-lg mb-8 leading-relaxed">
              {displayError}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-6 py-3 bg-[#F0653C] text-white font-bold text-sm rounded-xl hover:bg-[#d9552e] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                >
                  ↻ Retry Evaluation
                </button>
              )}
              {onNewUpload && (
                <button
                  onClick={onNewUpload}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all duration-200 border border-slate-200"
                >
                  Upload New Assessment
                </button>
              )}
            </div>
          </>
        ) : (
          /* ─── Normal Processing State ─── */
          <>
            {/* Animated 3-Star Orange Sparkle Graphic */}
            <div className="relative mb-6 w-24 h-24 flex items-center justify-center">
              
              {/* Main Coral Star */}
              <svg className="w-16 h-16 text-[#F0653C] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>

              {/* Secondary Star Below */}
              <svg className="w-8 h-8 text-[#FF7D5B] absolute -bottom-1 -left-1 animate-pulse" style={{ animationDelay: '0.3s' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>

              {/* Small Star Right */}
              <svg className="w-5 h-5 text-[#FFAA93] absolute top-2 -right-2 animate-bounce" style={{ animationDuration: '3s' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>

              {/* Tiny Dot Left */}
              <div className="w-2 h-2 rounded-full bg-[#F0653C] absolute top-3 left-1"></div>
            </div>

            {/* Text */}
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
              Extracting...
            </h2>
            
            <p className="text-sm font-semibold text-slate-400">
              This may take a while
            </p>

            {/* Progress Pipeline Subtext */}
            <div className="mt-8 px-4 py-2 bg-slate-50 rounded-full border border-slate-200 text-xs font-semibold text-slate-500">
              {progress.text || 'Extracting questions & handwritten answers...'}
            </div>
          </>
        )}

      </div>

    </div>
  );
}
