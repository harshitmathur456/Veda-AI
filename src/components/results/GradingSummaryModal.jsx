'use client';

import React from 'react';
import { X, Award, CheckCircle2, AlertTriangle, Download, Sparkles, FileText, Check, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function GradingSummaryModal({ summary, questions, answers, unanswered, onClose }) {
  if (!summary) return null;

  const handleExportPDF = async () => {
    const element = document.getElementById('grading-report-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('VedaAI_Grading_Report.pdf');
    } catch (err) {
      console.error("PDF Export error:", err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 relative my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold shadow-lg shadow-brand-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">AI Assessment Grading Summary</h2>
              <p className="text-xs text-slate-400 font-medium">Student Performance Analysis Summary</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Area */}
        <div id="grading-report-content" className="p-6 sm:p-8 space-y-6">
          
          {/* Top Score Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-brand-50 border border-brand-200 p-4 rounded-2xl text-center">
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">Total Score</p>
              <p className="text-3xl font-black text-slate-900">
                {summary.totalMarksObtained} <span className="text-sm text-slate-400 font-semibold">/ {summary.totalMaxMarks}</span>
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Percentage</p>
              <p className="text-3xl font-black text-emerald-900">
                {summary.percentage}%
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Attempted</p>
              <p className="text-3xl font-black text-slate-900">
                {summary.attemptedCount} <span className="text-sm text-slate-400 font-semibold">/ {summary.totalQuestions}</span>
              </p>
            </div>
          </div>

          {/* AI Teacher Overview */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-2 text-brand-400 font-extrabold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>AI TEACHER EVALUATION SUMMARY</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              {summary.overallTeacherNote}
            </p>
          </div>

          {/* Strengths & Weak Areas Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl">
              <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Key Strengths
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-800 font-medium">
                {summary.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weak Areas */}
            <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl">
              <h4 className="font-extrabold text-xs text-rose-900 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Areas Needing Review
              </h4>
              <ul className="space-y-1.5 text-xs text-rose-800 font-medium">
                {summary.weakAreas.map((weak, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleExportPDF}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Grading Report (PDF)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
