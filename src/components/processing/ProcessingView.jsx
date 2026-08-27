'use client';

import React from 'react';

export default function ProcessingView({ progress = { stage: 1, text: 'Extracting...' } }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-100">
      
      {/* Large Centered White Rounded Container */}
      <div className="w-full max-w-4xl min-h-[500px] bg-white rounded-3xl p-12 shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center">
        
        {/* Animated 3-Star Orange Sparkle Graphic matching Screenshot 1 */}
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

        {/* Text matching Screenshot 1 */}
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

      </div>

    </div>
  );
}
