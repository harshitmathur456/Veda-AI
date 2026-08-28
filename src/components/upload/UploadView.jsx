'use client';

import React, { useRef } from 'react';
import { Upload, FileText, X, ArrowRight, Sparkles, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function UploadView({
  qpFile,
  asFile,
  onQpFileChange,
  onAsFileChange,
  onStartMapping,
  onLoadSampleData,
  isSampleLoading = false,
  sampleError = null,
  onClearSampleError = () => {}
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
      
      {/* Quick Demo Sample Bar */}
      <div className="w-full max-w-2xl mb-4 bg-slate-900 text-white p-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-brand-500 fill-brand-500 shrink-0" />
          <span className="text-xs font-bold">Want an instant demo? Load a sample assessment:</span>
        </div>
        <button
          onClick={onLoadSampleData}
          disabled={isSampleLoading}
          className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          {isSampleLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading Sample...</span>
            </>
          ) : (
            <>
              <span>Try Sample Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Sample Error Banner */}
      {sampleError && (
        <div className="w-full max-w-2xl mb-6 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{sampleError}</span>
          </div>
          <button
            onClick={onClearSampleError}
            className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Title with Pastel Orange Background Rectangle */}
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 text-center tracking-tight mb-2 flex flex-wrap items-center justify-center gap-2">
        <span>Upload</span>
        <span className="bg-[#FFE8E1] text-[#F0653C] px-3 py-1 rounded-xl font-black">
          Question Paper & Answer Sheets
        </span>
      </h1>

      <p className="text-slate-500 text-sm font-medium text-center mb-8">
        Upload both files to get started
      </p>

      {/* Circular Avatar Graphic */}
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-100 to-amber-100 border-4 border-white shadow-md flex items-center justify-center relative">
          <div className="w-16 h-16 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-2xl shadow-inner">
            👩‍🏫
          </div>

          {/* Accent Dots Circle Ring */}
          <span className="absolute -top-1 right-2 w-3.5 h-3.5 bg-brand-500 rounded-full ring-2 ring-white"></span>
          <span className="absolute bottom-2 -left-1 w-3 h-3 bg-amber-400 rounded-full ring-2 ring-white"></span>
          <span className="absolute top-1/2 -right-2.5 w-2.5 h-2.5 bg-brand-400 rounded-full"></span>
        </div>
      </div>

      {/* Two Upload Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-8">
        
        {/* CARD 1: Question Paper */}
        <div
          onDrop={(e) => handleDrop(e, 'qp')}
          onDragOver={handleDragOver}
          onClick={() => !qpFile && qpInputRef.current?.click()}
          className={`relative rounded-3xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[190px] ${
            qpFile
              ? 'bg-slate-50 border-2 border-dashed border-slate-200'
              : 'border-2 border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
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
              <div className="w-12 h-12 rounded-2xl bg-slate-200/70 text-slate-700 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">
                Upload <span className="text-[#F0653C] font-extrabold">Question Paper</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Max 10MB</p>
            </>
          ) : (
            /* Filled File Box matching Screenshot 4 */
            <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  PDF
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                    {qpFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {qpFile.size > 1024 * 1024 ? `${(qpFile.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(qpFile.size / 1024)} KB`}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQpFileChange(null);
                }}
                className="w-6 h-6 rounded-full bg-slate-800 text-white hover:bg-slate-900 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* CARD 2: Answer Sheet */}
        <div
          onDrop={(e) => handleDrop(e, 'as')}
          onDragOver={handleDragOver}
          onClick={() => !asFile && asInputRef.current?.click()}
          className={`relative rounded-3xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[190px] ${
            asFile
              ? 'bg-slate-50 border-2 border-dashed border-slate-200'
              : 'border-2 border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
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
              <div className="w-12 h-12 rounded-2xl bg-slate-200/70 text-slate-700 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">
                Upload <span className="text-[#F0653C] font-extrabold">Answer Sheet</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Max 10MB</p>
            </>
          ) : (
            /* Filled File Box matching Screenshot 4 */
            <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  PDF
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                    {asFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {asFile.size > 1024 * 1024 ? `${(asFile.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(asFile.size / 1024)} KB`}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAsFileChange(null);
                }}
                className="w-6 h-6 rounded-full bg-slate-800 text-white hover:bg-slate-900 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* CTA Button */}
      <button
        onClick={onStartMapping}
        disabled={!isReady}
        className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          isReady
            ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-md cursor-pointer'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
        }`}
      >
        <span>Start Mapping</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Micro-copy */}
      <p className="text-xs text-slate-400 font-medium text-center mt-3">
        Once both files are uploaded, you'll able to map answers with questions
      </p>

    </div>
  );
}
