'use client';

import React from 'react';
import { 
  LayoutGrid, 
  NotebookPen, 
  FileText, 
  ClipboardList, 
  Clock, 
  Settings, 
  Sparkles,
  ChevronRight,
  ChevronsRight,
  PanelLeftClose,
  PieChart
} from 'lucide-react';

export default function Sidebar({ isCollapsed = false, onToggle = () => {} }) {
  const navItems = [
    { icon: LayoutGrid, label: 'Home', active: false },
    { icon: NotebookPen, label: 'My Classroom', active: false },
    { icon: FileText, label: 'Assignments', active: false },
    { icon: ClipboardList, label: 'Exams', active: true },
    { icon: Clock, label: 'My Library', active: false },
  ];

  if (isCollapsed) {
    return (
      <aside className="w-16 bg-white border-r border-slate-200/80 flex flex-col items-center justify-between py-4 z-20 shadow-2xs">
        {/* Top Logo */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center shadow-md">
            v
          </div>

          {/* Sparkle Button */}
          <button className="w-10 h-10 rounded-full bg-slate-900 border-2 border-brand-500 flex items-center justify-center text-white shadow-sm hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-brand-500 fill-brand-500" />
          </button>

          {/* Nav Icons */}
          <nav className="flex flex-col gap-5 text-slate-400">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  className={`p-2 rounded-xl transition-all ${
                    item.active
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-4">
          {/* School Badge */}
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-xs shadow-2xs">
            🎓
          </div>

          {/* Expand Toggle */}
          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Expand Sidebar"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 z-20 shadow-2xs">
      {/* Top Section */}
      <div>
        {/* Header & Logo */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center shadow-sm">
              v
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              VedaAI
            </span>
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* AI Teacher's Toolkit Pill Button */}
        <div className="mb-6">
          <button className="w-full py-2.5 px-4 bg-slate-900 border-2 border-brand-500 rounded-full text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-slate-800 transition-all">
            <Sparkles className="w-4 h-4 text-brand-500 fill-brand-500" />
            <span>AI Teacher's Toolkit</span>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  item.active
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.active ? 'text-slate-900' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <button className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>

        {/* School Footer Card */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200 flex-shrink-0">
            🎓
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">Delhi Public School</p>
            <p className="text-[10px] text-slate-400 truncate">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
