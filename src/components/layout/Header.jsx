'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  ArrowLeft, 
  HelpCircle, 
  Bell, 
  Sparkles, 
  ChevronDown, 
  ClipboardList, 
  User, 
  Settings, 
  LogOut, 
  Check, 
  Info,
  BookOpen
} from 'lucide-react';

export default function Header({ currentStep = 'upload', onBack = () => {} }) {
  const pathname = usePathname();
  const [activePopover, setActivePopover] = useState(null); // 'help' | 'notifications' | 'ai' | 'user' | null
  const [unreadCount, setUnreadCount] = useState(2);
  const [actionNotice, setActionNotice] = useState(null);
  
  const headerRightRef = useRef(null);

  // Close active popover when clicking outside the header right section or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRightRef.current && !headerRightRef.current.contains(event.target)) {
        setActivePopover(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActivePopover(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const togglePopover = (name) => {
    setActivePopover(prev => (prev === name ? null : name));
  };

  const showNotice = (msg) => {
    setActionNotice(msg);
    setActivePopover(null);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const getBreadcrumbTitle = () => {
    switch (pathname) {
      case '/home':
        return 'Home';
      case '/classroom':
        return 'My Classroom';
      case '/assignments':
        return 'Assignments';
      case '/library':
        return 'My Library';
      case '/exams':
      case '/':
      default:
        return 'Exams';
    }
  };

  const isExamsPage = pathname === '/exams' || pathname === '/';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Navigation & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {isExamsPage && currentStep !== 'upload' && (
          <button 
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 font-medium text-xs sm:text-sm">{getBreadcrumbTitle()}</span>
          {isExamsPage && currentStep === 'results' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold text-xs sm:text-sm">Question Paper & Answer Sheet Mapping</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions & Interactive User Profile */}
      <div ref={headerRightRef} className="flex items-center gap-3 relative">

        {/* Temporary Feedback Notice Toast */}
        {actionNotice && (
          <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 z-50 animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* 1. HELP ICON POPOVER */}
        <div className="relative">
          <button 
            onClick={() => togglePopover('help')}
            className={`p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer ${
              activePopover === 'help' ? 'bg-slate-100 text-slate-900 ring-2 ring-slate-200' : ''
            }`}
            title="Help & Overview"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {activePopover === 'help' && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-4 z-50 animate-fadeIn text-left">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-brand-500" />
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Help & Guide</h4>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                Upload a Question Paper and handwritten Answer Sheet to automatically extract questions, map student answers with bounding boxes, and evaluate performance using AI.
              </p>
              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 font-semibold leading-tight">
                  Pro-tip: Click <span className="font-bold text-slate-800">"Try Sample Assessment"</span> on the upload page for an instant live demo.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. NOTIFICATION BELL POPOVER */}
        <div className="relative">
          <button 
            onClick={() => togglePopover('notifications')}
            className={`p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 relative transition-all cursor-pointer ${
              activePopover === 'notifications' ? 'bg-slate-100 text-slate-900 ring-2 ring-slate-200' : ''
            }`}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {activePopover === 'notifications' && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-4 z-50 animate-fadeIn text-left">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-500" />
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Notifications</h4>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => setUnreadCount(0)}
                    className="text-[11px] font-bold text-brand-500 hover:text-brand-600 transition-colors cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {unreadCount > 0 ? (
                <div className="space-y-2">
                  <div className="p-2.5 bg-brand-50/50 border border-brand-100 rounded-xl flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0"></span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Assessment Evaluation Ready</p>
                      <p className="text-[11px] text-slate-500 font-medium">Sample assessment processed & ready for review.</p>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">5 minutes ago</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Supabase Sync Complete</p>
                      <p className="text-[11px] text-slate-500 font-medium">Grading summary record saved to cloud database.</p>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">1 hour ago</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <Check className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-700">No unread notifications</p>
                  <p className="text-[11px] text-slate-400">You're all caught up!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. AI TOOLKIT SPARKLE POPOVER */}
        <div className="relative">
          <button 
            onClick={() => togglePopover('ai')}
            className={`p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all cursor-pointer ${
              activePopover === 'ai' ? 'bg-slate-100 text-slate-900 ring-2 ring-slate-200' : ''
            }`}
            title="AI Teacher's Toolkit"
          >
            <Sparkles className="w-5 h-5 text-slate-700 fill-slate-200" />
          </button>

          {activePopover === 'ai' && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-4 z-50 animate-fadeIn text-left">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                <Sparkles className="w-4 h-4 text-brand-500 fill-brand-500" />
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">AI Teacher's Toolkit</h4>
              </div>

              <div className="space-y-2">
                <div 
                  onClick={() => showNotice('Automated Grading is active')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Exam Answer Mapping</p>
                      <p className="text-[10px] text-slate-400 font-medium">Automatic BBox & Grading</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Active</span>
                </div>

                <div 
                  onClick={() => showNotice('Rubric Generator coming soon')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 flex items-center justify-between cursor-pointer transition-colors opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Smart Rubric Builder</p>
                      <p className="text-[10px] text-slate-400 font-medium">Generate custom grading criteria</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">Beta</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. USER PROFILE DROPDOWN MENU */}
        <div className="relative">
          <div 
            onClick={() => togglePopover('user')}
            className={`flex items-center gap-2.5 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 transition-all select-none ${
              activePopover === 'user' ? 'bg-slate-100 ring-2 ring-slate-200' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden shrink-0">
              <span className="bg-gradient-to-tr from-brand-500 to-amber-400 w-full h-full flex items-center justify-center font-extrabold text-white">HM</span>
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline-block">Harshit Mathur</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${activePopover === 'user' ? 'rotate-180' : ''}`} />
          </div>

          {activePopover === 'user' && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn text-left">
              {/* User Identity Header */}
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-extrabold text-slate-900 truncate">Harshit Mathur</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">harshit.mathur@dps.edu.in</p>
              </div>

              {/* Menu Items */}
              <div className="space-y-1">
                <button
                  onClick={() => showNotice('Profile settings loaded')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => showNotice('Settings panel loaded')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
                </button>

                <div className="border-t border-slate-100 my-1"></div>

                <button
                  onClick={() => showNotice('Logged out successfully')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
