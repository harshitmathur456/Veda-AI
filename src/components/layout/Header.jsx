'use client';

import React from 'react';
import { ArrowLeft, HelpCircle, Bell, Sparkles, ChevronDown, ClipboardList } from 'lucide-react';

export default function Header({ currentStep = 'upload', onBack = () => {} }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Navigation & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {currentStep !== 'upload' && (
          <button 
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 font-medium text-xs sm:text-sm">Exams</span>
          {currentStep === 'results' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold text-xs sm:text-sm">Question Paper & Answer Sheet Mapping</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center gap-4">
        {/* Help Icon */}
        <button className="p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <button className="p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Four-point Sparkle Icon */}
        <button className="p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
          <Sparkles className="w-5 h-5 text-slate-700" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 cursor-pointer pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden">
            <span className="bg-gradient-to-tr from-brand-500 to-amber-400 w-full h-full flex items-center justify-center">MR</span>
          </div>
          <span className="text-xs font-bold text-slate-800 hidden sm:inline-block">Madhur Rastogi</span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </header>
  );
}
