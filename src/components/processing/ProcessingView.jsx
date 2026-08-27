'use client';

import React from 'react';
import { Sparkles, CheckCircle2, Loader2, FileCheck, Layers, BrainCircuit, Award } from 'lucide-react';

export default function ProcessingView({ progress = { stage: 1, text: 'Processing files...' } }) {
  const stages = [
    { id: 1, label: 'Question Paper Extraction', icon: FileCheck },
    { id: 2, label: 'Handwritten Answer OCR & Bounding Boxes', icon: Layers },
    { id: 3, label: 'Semantic Q&A Mapping', icon: BrainCircuit },
    { id: 4, label: 'AI Grading & Feedback', icon: Award },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center">
      {/* Centered Large Card */}
      <div className="w-full bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/80 flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Decorative Top Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-400 via-brand-500 to-amber-500"></div>

        {/* Animated Sparkle Icon Container */}
        <div className="w-20 h-20 rounded-3xl bg-brand-50 border border-brand-200 text-brand-500 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/10 relative">
          <Sparkles className="w-10 h-10 animate-spin text-brand-500" style={{ animationDuration: '6s' }} />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-500"></span>
          </span>
        </div>

        {/* Stage Header */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Processing <span className="text-brand-500 font-black">Assessment...</span>
        </h2>
        <p className="text-sm font-semibold text-slate-500 mb-8 max-w-sm">
          {progress.text || 'Extracting questions and mapping handwritten answer regions...'}
        </p>

        {/* Pipeline Progress Stages List */}
        <div className="w-full space-y-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 text-left">
          {stages.map((stage) => {
            const isCompleted = progress.stage > stage.id;
            const isCurrent = progress.stage === stage.id;
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-white border-brand-500 shadow-md ring-2 ring-brand-500/20'
                    : isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-white/50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isCurrent ? 'text-slate-900' : isCompleted ? 'text-emerald-900' : 'text-slate-500'}`}>
                      Stage {stage.id}: {stage.label}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {isCompleted ? 'Completed' : isCurrent ? 'In progress...' : 'Pending'}
                    </p>
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-brand-100 text-brand-600 px-2.5 py-1 rounded-full animate-pulse">
                    Active
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Powered by Gemini Vision Multimodal & Veda AI Pipeline
        </p>
      </div>
    </div>
  );
}
