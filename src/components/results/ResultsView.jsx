'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import QuestionList from './QuestionList';
import AnswerViewer from './AnswerViewer';
import GradingSummaryModal from './GradingSummaryModal';
import {
  Layers,
  FileText,
  Award,
  ArrowLeft,
  User,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import { detectStudentNameFromFilename, saveAssessmentResultToSupabase } from '@/lib/studentUtils';

export default function ResultsView({
  questions = [],
  answers = [],
  unanswered = [],
  summary = null,
  asImages = [],
  qpFileName = 'Sample_Question_Paper.pdf',
  asFileName = 'Sample_Answer_Sheet.pdf',
  onResetUpload
}) {
  const [selectedQuestionId, setSelectedQuestionId] = useState(questions[0]?.id || 'q1');
  const [activeMobileTab, setActiveMobileTab] = useState('questions'); // 'questions' | 'answers'
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Student name auto-detection & persistence state
  const detectedInfo = useMemo(() => detectStudentNameFromFilename(asFileName), [asFileName]);

  const [studentName, setStudentName] = useState(detectedInfo.studentName || '');
  const [studentNameSource, setStudentNameSource] = useState(detectedInfo.studentNameSource);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error' | 'unsaved'
  const [toast, setToast] = useState(null);

  const hasAutoSavedRef = useRef(false);

  // Save to Supabase function
  const performSave = async (currentName, currentSource) => {
    setIsSaving(true);
    const marksScored = summary?.totalMarksObtained ?? answers.reduce((acc, a) => acc + (Number(a.marks) || 0), 0);
    const maxMarks = summary?.totalMaxMarks ?? questions.reduce((acc, q) => acc + (Number(q.maxMarks) || 0), 0);

    const res = await saveAssessmentResultToSupabase({
      questionPaperName: qpFileName,
      handwrittenAnsPdfName: asFileName,
      studentName: currentName,
      studentNameSource: currentSource,
      marksScored,
      maxMarks
    });

    setIsSaving(false);
    if (res.success) {
      setSaveStatus('saved');
    } else {
      setSaveStatus('error');
      setToast({
        type: 'error',
        text: `Supabase persistence note: ${res.error}`
      });
    }
  };

  // Auto-save on component mount once grading finishes
  useEffect(() => {
    if (!hasAutoSavedRef.current) {
      hasAutoSavedRef.current = true;
      performSave(studentName, studentNameSource);
    }
  }, []);

  // Handle teacher editing the student name field
  const handleStudentNameChange = (e) => {
    const val = e.target.value;
    setStudentName(val);
    if (val.trim()) {
      setStudentNameSource('manual');
    } else {
      setStudentNameSource('unspecified');
    }
    setSaveStatus('unsaved');
  };

  // Handle question selection + auto-switch tab on mobile
  const handleSelectQuestion = (id) => {
    setSelectedQuestionId(id);
    if (window.innerWidth < 768) {
      setActiveMobileTab('answers');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 sm:p-6 bg-slate-100 gap-3 sm:gap-4 overflow-hidden relative">
      
      {/* Top Results Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:px-6 sm:py-3 rounded-2xl border border-slate-200 shadow-sm">
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

      {/* Student Name & Supabase Persistence Bar */}
      <div className="bg-white px-4 py-3 sm:px-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 uppercase tracking-wider shrink-0">
            <User className="w-4 h-4 text-brand-500" />
            <span>Student Name:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={studentName}
              onChange={handleStudentNameChange}
              placeholder="Enter student name..."
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 focus:border-brand-500 focus:bg-white text-xs font-extrabold text-slate-900 rounded-xl outline-none transition-all w-52 sm:w-64 shadow-inner"
            />

            {studentNameSource === 'auto_detected' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Detected from filename
              </span>
            )}

            {studentNameSource === 'manual' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                Manual Entry
              </span>
            )}

            {studentNameSource === 'unspecified' && !studentName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                Unspecified
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {saveStatus !== 'saved' && (
            <button
              onClick={() => performSave(studentName, studentNameSource)}
              disabled={isSaving}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 ${
                saveStatus === 'error'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Retry Save</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Result</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Split Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        
        {/* Left Panel: Questions List */}
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

        {/* Right Panel: Answer Viewer */}
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

      {/* Non-blocking Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl border flex items-center justify-between gap-3 transition-all animate-bounce-in ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500/30'
              : 'bg-amber-950 text-amber-100 border-amber-500/40'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>

          <button
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
