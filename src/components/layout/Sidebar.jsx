'use client';

import React from 'react';
import { 
  Home, 
  Users, 
  FileText, 
  Award, 
  BookOpen, 
  Settings, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

export default function Sidebar({ isCollapsed = false, onToggle = () => {} }) {
  const navItems = [
    { icon: Home, label: 'Home', active: false },
    { icon: Users, label: 'My Classroom', active: false },
    { icon: FileText, label: 'Assignments', active: false },
    { icon: Award, label: 'Exams', active: true },
    { icon: BookOpen, label: 'My Library', active: false },
  ];

  return (
    <aside 
      className={`bg-slate-900 text-white flex flex-col justify-between transition-all duration-300 ease-in-out relative z-20 shadow-xl ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-brand-500/30 flex-shrink-0">
              V
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap">
                <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                  Veda<span className="text-brand-500">AI</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Smart Assessment Platform</p>
              </div>
            )}
          </div>

          {/* Toggle button */}
          <button
            onClick={onToggle}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* AI Toolkit Callout Button */}
        <div className="p-4">
          {!isCollapsed ? (
            <button className="w-full py-2.5 px-3 rounded-xl bg-slate-800 border border-brand-500/40 text-brand-400 font-semibold text-xs flex items-center justify-between hover:bg-slate-800/80 transition-all shadow-sm group">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500 group-hover:rotate-12 transition-transform" />
                <span>AI Teacher's Toolkit</span>
              </span>
              <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-bold">PRO</span>
            </button>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-800 border border-brand-500/40 flex items-center justify-center text-brand-500 cursor-pointer" title="AI Teacher's Toolkit">
              <Sparkles className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  item.active
                    ? 'bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <Icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-slate-800">
        <button 
          className={`w-full flex items-center gap-3.5 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl text-sm font-medium mb-2 ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5 text-slate-400" />
          {!isCollapsed && <span>Settings</span>}
        </button>

        {/* School Profile Card */}
        {!isCollapsed ? (
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-4 h-4 text-brand-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Delhi Public School</p>
              <p className="text-[10px] text-slate-400 truncate">Science Dept • Sec-IV</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-lg bg-slate-800 flex items-center justify-center text-brand-500" title="Delhi Public School">
            <GraduationCap className="w-5 h-5" />
          </div>
        )}
      </div>
    </aside>
  );
}
