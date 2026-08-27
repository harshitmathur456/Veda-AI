'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { FileText, Clock } from 'lucide-react';

export default function AssignmentsPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-6 shadow-md">
          <FileText className="w-8 h-8 text-brand-500" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
          Assignments
        </h1>

        <p className="text-sm font-semibold text-slate-500 max-w-md mb-8">
          Create, distribute, and grade regular homework assignments and lab reports.
        </p>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Assignments Module — Coming Soon</h3>
          <p className="text-xs text-slate-400 font-medium">
            Homework creation and automated grading rules are coming in the next release.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
