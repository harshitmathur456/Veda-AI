'use client';

import React from 'react';
import { ArrowLeft, Bell, HelpCircle, Sparkles, ChevronDown, User } from 'lucide-react';

export default function Header({ currentStep = 'upload', onBack = () => {} }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Navigation & Breadcrumbs */}
      <div className="flex items-center gap-4">
        {currentStep !== 'upload' && (
          <button 
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Upload"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-slate-400">Exams</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">Question Paper & Answer Sheet Mapping</span>
        </div>
      </div>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center gap-4">
        {/* Help Icon */}
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* AI Toolkit Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full border border-brand-200 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Veda AI Engine Active</span>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-[1px] bg-slate-200"></div>

        {/* User Profile Dropdown */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-brand-500/20">
            HM
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">Harshit Mathur</p>
            <p className="text-[11px] text-slate-500">Teacher • Grade 10</p>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>
    </header>
  );
}
