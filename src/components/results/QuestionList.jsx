'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

export default function QuestionList({
  questions = [],
  answers = [],
  unanswered = [],
  selectedQuestionId,
  onSelectQuestion,
  onOpenSummaryModal
}) {
  const [expandedIds, setExpandedIds] = useState(new Set(['q2']));
  const [allExpanded, setAllExpanded] = useState(false);

  const answerMap = new Map();
  answers.forEach(ans => {
    if (ans.questionId) answerMap.set(ans.questionId, ans);
  });

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
      
      {/* Panel Header matching Screenshot 2 */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
          Extracted Questions (from question paper)
        </h2>

        <button
          onClick={toggleExpandAll}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs"
        >
          {allExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
        </button>
      </div>

      {/* Question Cards Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {questions.map((q) => {
          const isSelected = selectedQuestionId === q.id;
          const isExpanded = expandedIds.has(q.id) || isSelected;
          const ans = answerMap.get(q.id);

          // Score Pill color coding strictly based on numeric marks ratio:
          // 0 marks -> SOLID RED (bg-red-500 text-white)
          // Partial marks -> SOLID AMBER (bg-amber-500 text-white)
          // Full marks -> SOLID GREEN (bg-emerald-500 text-white)
          let badgeBg = 'bg-red-500 text-white font-black shadow-xs';
          let scoreText = `0/${q.maxMarks || 1}`;

          if (q.isExcludedAlternative) {
            badgeBg = 'bg-slate-100 text-slate-500 font-bold border border-slate-200';
            scoreText = 'OR Choice (Not Selected)';
          } else if (ans) {
            const marks = Number(ans.marks ?? 0);
            const maxMarks = Number(ans.maxMarks ?? q.maxMarks ?? 1);
            scoreText = `${marks}/${maxMarks}`;

            if (marks <= 0) {
              badgeBg = 'bg-red-500 text-white font-black shadow-xs'; // Solid Bold Red
            } else if (marks >= maxMarks || (marks / maxMarks) >= 0.85) {
              badgeBg = 'bg-emerald-500 text-white font-black shadow-xs'; // Solid Bold Green
            } else {
              badgeBg = 'bg-amber-500 text-white font-black shadow-xs'; // Solid Bold Amber
            }
          } else {
            scoreText = `0/${q.maxMarks || 1}`;
            badgeBg = 'bg-red-500 text-white font-black shadow-xs'; // Solid Bold Red for unattempted
          }

          return (
            <div
              key={q.id}
              onClick={() => onSelectQuestion(q.id)}
              className={`rounded-2xl p-4 transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-white border-2 border-[#F0653C] shadow-md'
                  : q.isExcludedAlternative
                  ? 'bg-slate-50/60 border border-slate-200/60 opacity-75'
                  : 'bg-white border border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Q Number Badge */}
                  <div className="flex items-center gap-1">
                    <span className="w-7 h-7 rounded-full bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {q.qNo}
                    </span>
                    {q.subPart && (
                      <span className="text-xs font-black text-slate-800 ml-0.5">
                        {q.subPart}
                      </span>
                    )}
                    {q.isAlternativeGroup && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 ml-1">
                        OR
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug pt-0.5">
                    {q.text}
                  </p>
                </div>

                {/* Score Pill & Chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs ${badgeBg}`}>
                    {scoreText}
                  </span>

                  <button
                    onClick={(e) => toggleExpand(q.id, e)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Inline AI Feedback & Rationale Section */}
              {isExpanded && ans && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                    {ans.rationale && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                        <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider mb-0.5">
                          Grading Rationale ({ans.marks}/{ans.maxMarks} Marks)
                        </p>
                        <p className="text-slate-800 font-semibold leading-relaxed">
                          {ans.rationale}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="font-extrabold text-slate-900 mb-0.5">AI Teacher Feedback</p>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {ans.feedback}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Bar */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <button
          onClick={onOpenSummaryModal}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-brand-500 fill-brand-500" />
          <span>View Overall Assessment Report</span>
        </button>
      </div>

    </div>
  );
}
