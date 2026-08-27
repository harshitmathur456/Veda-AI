'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Maximize2, 
  Minimize2,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

export default function QuestionList({
  questions = [],
  answers = [],
  unanswered = [],
  selectedQuestionId,
  onSelectQuestion,
  onOpenSummaryModal
}) {
  const [filter, setFilter] = useState('all'); // 'all', 'matched', 'unanswered', 'unmatched'
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Map answers & unanswered info by questionId
  const answerMap = new Map();
  answers.forEach(ans => {
    if (ans.questionId) answerMap.set(ans.questionId, ans);
  });

  const unansweredMap = new Map();
  unanswered.forEach(u => unansweredMap.set(u.questionId, u));

  // Toggle expand for single card
  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle expand all
  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
      setAllExpanded(false);
    } else {
      const allIds = new Set(questions.map(q => q.id));
      setExpandedIds(allIds);
      setAllExpanded(true);
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const ans = answerMap.get(q.id);
    const unans = unansweredMap.get(q.id);

    if (filter === 'matched') return Boolean(ans);
    if (filter === 'unanswered') return Boolean(unans);
    return true;
  });

  const unmatchedAnswers = answers.filter(a => a.status === 'unmatched');

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-500"></div>
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
              Extracted Questions
            </h2>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleExpandAll}
              className="text-xs font-semibold text-slate-600 hover:text-brand-600 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition-colors flex items-center gap-1"
            >
              {allExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({questions.length})
          </button>
          <button
            onClick={() => setFilter('matched')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              filter === 'matched'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Matched ({answerMap.size})
          </button>
          <button
            onClick={() => setFilter('unanswered')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              filter === 'unanswered'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
            }`}
          >
            Unanswered ({unanswered.length})
          </button>
          {unmatchedAnswers.length > 0 && (
            <button
              onClick={() => setFilter('unmatched')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                filter === 'unmatched'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              Unmatched ({unmatchedAnswers.length})
            </button>
          )}
        </div>
      </div>

      {/* Question Cards Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filter !== 'unmatched' ? (
          filteredQuestions.map((q) => {
            const isSelected = selectedQuestionId === q.id;
            const isExpanded = expandedIds.has(q.id) || isSelected;
            const ans = answerMap.get(q.id);
            const unans = unansweredMap.get(q.id);

            // Determine score pill status
            let scoreBadgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
            let scoreText = `${q.maxMarks} Marks`;

            if (ans) {
              if (ans.verdict === 'correct') {
                scoreBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold';
                scoreText = `${ans.marks}/${ans.maxMarks}`;
              } else if (ans.verdict === 'partial') {
                scoreBadgeBg = 'bg-amber-50 text-amber-700 border-amber-300 font-extrabold';
                scoreText = `${ans.marks}/${ans.maxMarks}`;
              } else {
                scoreBadgeBg = 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold';
                scoreText = `0/${ans.maxMarks}`;
              }
            } else if (unans) {
              scoreBadgeBg = 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold';
              scoreText = 'Unanswered';
            }

            return (
              <div
                key={q.id}
                onClick={() => onSelectQuestion(q.id)}
                className={`rounded-2xl p-4 transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-brand-50/70 border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Q Number Badge */}
                    <div className="flex items-center gap-1">
                      <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-sm ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-900 text-white'
                      }`}>
                        {q.qNo}
                      </span>
                      {q.subPart && (
                        <span className="w-5 h-5 rounded-lg bg-brand-100 text-brand-700 font-black text-[11px] flex items-center justify-center border border-brand-300">
                          {q.subPart}
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <p className={`text-xs sm:text-sm font-semibold leading-relaxed ${
                      isSelected ? 'text-slate-900' : 'text-slate-800'
                    }`}>
                      {q.text}
                    </p>
                  </div>

                  {/* Score Badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-xl text-xs border ${scoreBadgeBg}`}>
                      {scoreText}
                    </span>

                    <button
                      onClick={(e) => toggleExpand(q.id, e)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Inline AI Feedback Section */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2 animate-fadeIn">
                    {ans ? (
                      <div className="bg-white/80 p-3 rounded-xl border border-slate-200/90 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                            AI Teacher Feedback
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Confidence: {Math.round((ans.confidence || 0.9) * 100)}%
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {ans.feedback}
                        </p>

                        <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60 font-mono text-[11px] text-slate-700">
                          <span className="font-bold text-slate-500 block mb-0.5">Extracted Student Handwriting:</span>
                          "{ans.extractedText}"
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200 text-xs text-rose-800">
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>No Answer Found on Answer Sheet</span>
                        </div>
                        <p className="text-[11px] text-rose-700">
                          This question was left unanswered by the student. 0 marks awarded.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Unmatched Answers View */
          unmatchedAnswers.map((unm, idx) => (
            <div key={idx} className="bg-amber-50 rounded-2xl p-4 border border-amber-300">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Unmatched Handwritten Region (Page {unm.page})</span>
              </div>
              <p className="text-xs text-slate-700 font-mono bg-white p-2.5 rounded-xl border border-amber-200">
                "{unm.extractedText}"
              </p>
              <p className="text-[11px] text-amber-700 mt-2 font-medium">
                AI Flag: Appears to be student rough work or un-numbered notes. Not linked to any specific question.
              </p>
            </div>
          ))
        )}
      </div>

      {/* Panel Bottom Bar - Summary trigger */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button
          onClick={onOpenSummaryModal}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>View Overall Grading Summary</span>
        </button>
      </div>

    </div>
  );
}
