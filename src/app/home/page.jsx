'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { LayoutGrid, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-6 shadow-md">
          <LayoutGrid className="w-8 h-8 text-brand-500" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
          Teacher Home Dashboard
        </h1>

        <p className="text-sm font-semibold text-slate-500 max-w-md mb-8">
          Welcome back, Harshit! Manage your classroom activities, track student performance analytics, and access AI tools.
        </p>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-lg w-full text-left space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-brand-500 fill-brand-500" />
            <h3 className="font-extrabold text-sm text-slate-900">Featured Tool: AI Exam Mapping</h3>
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Upload question papers and student handwritten answer sheets for automated extraction, bounding box mapping, and AI feedback.
          </p>
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <span>Go to Exams & Assessment Mapping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
