'use client';

import React, { useState } from 'react';
import QuestionList from './QuestionList';
import AnswerViewer from './AnswerViewer';
import GradingSummaryModal from './GradingSummaryModal';
import { Layers, FileText, Award, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ResultsView({
  questions = [],
  answers = [],
  unanswered = [],
  summary = null,
  asImages = [],
  onResetUpload
}) {
  const [selectedQuestionId, setSelectedQuestionId] = useState(questions[0]?.id || 'q1');
  const [activeMobileTab, setActiveMobileTab] = useState('questions'); // 'questions' | 'answers'
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Handle question selection + auto-switch tab on mobile
  const handleSelectQuestion = (id) => {
    setSelectedQuestionId(id);
    if (window.innerWidth < 768) {
      setActiveMobileTab('answers');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 sm:p-6 bg-slate-100 gap-4 overflow-hidden">
      
      {/* Top Results Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:px-6 sm:py-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={onResetUpload}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Upload New Assessment</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800">
              Extraction Complete
            </span>
          </div>
        </div>

        {/* Mobile Segmented Tab Switcher */}
        <div className="flex md:hidden w-full bg-slate-100 p-1 rounded-xl font-bold text-xs">
          <button
            onClick={() => setActiveMobileTab('questions')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeMobileTab === 'questions'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Questions ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('answers')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeMobileTab === 'answers'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Answer Sheet</span>
          </button>
        </div>

        {/* Overall Grading CTA Trigger */}
        <button
          onClick={() => setShowSummaryModal(true)}
          className="hidden sm:flex px-4 py-2 bg-gradient-to-r from-brand-500 to-amber-500 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all items-center gap-2"
        >
          <Award className="w-4 h-4" />
          <span>Overall Score: {summary?.totalMarksObtained}/{summary?.totalMaxMarks} ({summary?.percentage}%)</span>
        </button>
      </div>

      {/* Main Split Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        
        {/* Left Panel: Questions List (7 cols on large, 5 on desktop) */}
        <div 
          className={`md:col-span-5 h-full min-h-0 ${
            activeMobileTab === 'questions' ? 'block' : 'hidden md:block'
          }`}
        >
          <QuestionList
            questions={questions}
            answers={answers}
            unanswered={unanswered}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={handleSelectQuestion}
            onOpenSummaryModal={() => setShowSummaryModal(true)}
          />
        </div>

        {/* Right Panel: Answer Viewer (7 cols on desktop) */}
        <div 
          className={`md:col-span-7 h-full min-h-0 ${
            activeMobileTab === 'answers' ? 'block' : 'hidden md:block'
          }`}
        >
          <AnswerViewer
            answers={answers}
            questions={questions}
            selectedQuestionId={selectedQuestionId}
            onSelectAnswer={(id) => setSelectedQuestionId(id)}
            asImages={asImages}
          />
        </div>

      </div>

      {/* Summary Modal */}
      {showSummaryModal && (
        <GradingSummaryModal
          summary={summary}
          questions={questions}
          answers={answers}
          unanswered={unanswered}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

    </div>
  );
}
