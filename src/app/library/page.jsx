'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { BookOpen, User, Calendar, Award, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LibraryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('assessment_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setRecords(data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <AppShell currentStep="library">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-brand-500" />
              <span>Assessment Results Library</span>
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Historical record of all evaluated student answer sheets saved to Supabase.
            </p>
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>

        {/* Saved Assessment Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
          <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-500" />
            <span>Graded Assessment Records ({records.length})</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              Loading records from Supabase...
            </div>
          ) : error ? (
            <div className="py-8 px-4 bg-amber-50 rounded-2xl border border-amber-200 text-center text-xs text-amber-800 font-semibold">
              <p className="font-extrabold mb-1">Supabase Notice</p>
              <p>{error}</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              No saved grading sessions found in Supabase yet. Run a grading session on the Exams tab to save records!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Name Source</th>
                    <th className="py-3 px-4">Question Paper</th>
                    <th className="py-3 px-4">Answer Sheet PDF</th>
                    <th className="py-3 px-4 text-right">Marks Scored</th>
                    <th className="py-3 px-4 text-right">Date Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{r.student_name || 'Unspecified'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          r.student_name_source === 'auto_detected'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : r.student_name_source === 'manual'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.student_name_source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">{r.question_paper_name}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate">{r.handwritten_ans_pdf_name}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {r.marks_scored} / {r.max_marks} ({((r.marks_scored / (r.max_marks || 1)) * 100).toFixed(0)}%)
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : 'Just now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
