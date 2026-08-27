'use client';

import React, { useRef } from 'react';
import { UploadCloud, FileText, X, ArrowRight, Sparkles, CheckCircle2, FileUp } from 'lucide-react';
import { SAMPLE_QUESTION_PAPER_NAME, SAMPLE_ANSWER_SHEET_NAME } from '@/lib/mockData';

export default function UploadView({
  qpFile,
  asFile,
  onQpFileChange,
  onAsFileChange,
  onStartMapping,
  onLoadSampleData
}) {
  const qpInputRef = useRef(null);
  const asInputRef = useRef(null);

  const isReady = Boolean(qpFile && asFile);

  const handleDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (type === 'qp') onQpFileChange(file);
      if (type === 'as') onAsFileChange(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Decorative Illustration Badge */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 border-4 border-white shadow-xl flex items-center justify-center relative">
          <Sparkles className="w-10 h-10 text-brand-500 animate-pulse" />
          
          {/* Orange Accent Dots */}
          <span className="absolute -top-1 right-1 w-3 h-3 bg-brand-500 rounded-full ring-2 ring-white"></span>
          <span className="absolute bottom-1 -left-1 w-2.5 h-2.5 bg-brand-400 rounded-full ring-2 ring-white"></span>
          <span className="absolute top-1/2 -right-2 w-2 h-2 bg-amber-400 rounded-full"></span>
        </div>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center tracking-tight leading-tight mb-2">
        Upload{' '}
        <span className="bg-brand-100 text-brand-600 px-3 py-1 rounded-2xl border border-brand-200 inline-block font-extrabold shadow-sm">
          Question Paper & Answer Sheets
        </span>
      </h1>

      <p className="text-slate-500 text-sm sm:text-base font-medium text-center mb-8 max-w-lg">
        Upload both files to automatically extract questions, map student handwritten answers, and view AI feedback.
      </p>

      {/* Quick Sample Trigger Banner */}
      <div className="w-full mb-8 bg-gradient-to-r from-brand-500 via-brand-600 to-amber-500 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">Want an instant demo?</h3>
            <p className="text-xs text-brand-100">Load our pre-processed Class 10 Science Unit Test with 1-click.</p>
          </div>
        </div>
        <button
          onClick={onLoadSampleData}
          className="w-full sm:w-auto px-5 py-2.5 bg-white text-brand-600 font-bold text-xs rounded-xl shadow-md hover:bg-brand-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span>Try Sample Assessment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Two Upload Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
        
        {/* CARD 1: Question Paper */}
        <div
          onDrop={(e) => handleDrop(e, 'qp')}
          onDragOver={handleDragOver}
          onClick={() => !qpFile && qpInputRef.current?.click()}
          className={`relative rounded-2xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] ${
            qpFile
              ? 'bg-white border-2 border-brand-500 shadow-lg shadow-brand-500/10'
              : 'border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-brand-50/40 hover:border-brand-400 hover:shadow-md'
          }`}
        >
          <input
            type="file"
            ref={qpInputRef}
            accept=".pdf,image/*"
            onChange={(e) => e.target.files?.[0] && onQpFileChange(e.target.files[0])}
            className="hidden"
          />

          {!qpFile ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4 text-brand-500 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-1">
                Upload <span className="text-brand-500 font-extrabold">Question Paper</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mb-3">PDF or Images (JPEG, PNG)</p>
              <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[11px] font-semibold">
                Max 10MB
              </span>
            </>
          ) : (
            <div className="w-full flex flex-col items-center relative">
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQpFileChange(null);
                }}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-3 font-bold border border-red-200">
                <FileText className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-sm text-slate-900 truncate max-w-[240px] mb-1">
                {qpFile.name}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{(qpFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: Student Answer Sheet */}
        <div
          onDrop={(e) => handleDrop(e, 'as')}
          onDragOver={handleDragOver}
          onClick={() => !asFile && asInputRef.current?.click()}
          className={`relative rounded-2xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] ${
            asFile
              ? 'bg-white border-2 border-brand-500 shadow-lg shadow-brand-500/10'
              : 'border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-brand-50/40 hover:border-brand-400 hover:shadow-md'
          }`}
        >
          <input
            type="file"
            ref={asInputRef}
            accept=".pdf,image/*"
            onChange={(e) => e.target.files?.[0] && onAsFileChange(e.target.files[0])}
            className="hidden"
          />

          {!asFile ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4 text-brand-500 group-hover:scale-110 transition-transform">
                <FileUp className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-1">
                Upload <span className="text-brand-500 font-extrabold">Answer Sheet</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mb-3">Handwritten PDF or Scanned Images</p>
              <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[11px] font-semibold">
                Max 10MB
              </span>
            </>
          ) : (
            <div className="w-full flex flex-col items-center relative">
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAsFileChange(null);
                }}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 font-bold border border-blue-200">
                <FileText className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-sm text-slate-900 truncate max-w-[240px] mb-1">
                {asFile.name}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{(asFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* CTA Button */}
      <button
        onClick={onStartMapping}
        disabled={!isReady}
        className={`w-full max-w-md py-4 rounded-2xl font-extrabold text-base transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
          isReady
            ? 'bg-slate-900 text-white hover:bg-brand-500 shadow-brand-500/20 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
            : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
        }`}
      >
        <span>Start Mapping</span>
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Micro-copy */}
      <p className="text-xs text-slate-400 font-medium text-center mt-3">
        {isReady
          ? 'Both files loaded! Click above to launch AI extraction & bounding box mapping.'
          : "Once both files are uploaded, you'll be able to map answers with questions."}
      </p>
    </div>
  );
}
