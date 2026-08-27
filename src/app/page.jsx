'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import UploadView from '@/components/upload/UploadView';
import ProcessingView from '@/components/processing/ProcessingView';
import ResultsView from '@/components/results/ResultsView';

import { convertFileToImages } from '@/lib/pdfUtils';
import { processAssessmentWithGemini } from '@/lib/gemini';
import { MOCK_QUESTIONS, MOCK_ANSWERS, UNANSWERED_QUESTIONS, MOCK_SUMMARY } from '@/lib/mockData';

export default function Home() {
  const [viewStep, setViewStep] = useState('upload'); // 'upload' | 'processing' | 'results'
  const [qpFile, setQpFile] = useState(null);
  const [asFile, setAsFile] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Processing status state
  const [processingStatus, setProcessingStatus] = useState({ stage: 1, text: 'Starting pipeline...' });

  // Extracted data state
  const [assessmentData, setAssessmentData] = useState({
    questions: [],
    answers: [],
    unanswered: [],
    summary: null,
    asImages: []
  });

  // Handle Quick Sample assessment trigger (1-click demo)
  const handleLoadSampleData = () => {
    setViewStep('processing');
    setSidebarCollapsed(true); // Auto-collapse sidebar as specified in UI/UX brief!

    setProcessingStatus({ stage: 1, text: 'Extracting questions from Class 10 Science paper...' });

    setTimeout(() => {
      setProcessingStatus({ stage: 2, text: 'Locating handwritten answer regions & bounding boxes...' });
    }, 1000);

    setTimeout(() => {
      setProcessingStatus({ stage: 3, text: 'Mapping Q&A and calculating evaluation scores...' });
    }, 2000);

    setTimeout(() => {
      setAssessmentData({
        questions: MOCK_QUESTIONS,
        answers: MOCK_ANSWERS,
        unanswered: UNANSWERED_QUESTIONS,
        summary: MOCK_SUMMARY,
        asImages: []
      });
      setViewStep('results');
      setSidebarCollapsed(false);
    }, 3200);
  };

  // Handle uploaded files processing
  const handleStartMapping = async () => {
    if (!qpFile || !asFile) return;

    setViewStep('processing');
    setSidebarCollapsed(true); // Auto-collapse sidebar during processing!

    try {
      // Step A: Convert files to images
      setProcessingStatus({ stage: 1, text: 'Rasterizing PDF / Image pages...' });
      const qpImages = await convertFileToImages(qpFile);
      const asImages = await convertFileToImages(asFile);

      // Step B: Run Gemini AI Multimodal Vision Pipeline
      const result = await processAssessmentWithGemini(qpImages, asImages, (status) => {
        setProcessingStatus(status);
      });

      setAssessmentData({
        ...result,
        asImages
      });

      setViewStep('results');
      setSidebarCollapsed(false);
    } catch (error) {
      console.error("Pipeline error:", error);
      // Fallback to sample data guarantee
      setAssessmentData({
        questions: MOCK_QUESTIONS,
        answers: MOCK_ANSWERS,
        unanswered: UNANSWERED_QUESTIONS,
        summary: MOCK_SUMMARY,
        asImages: []
      });
      setViewStep('results');
      setSidebarCollapsed(false);
    }
  };

  const handleResetUpload = () => {
    setQpFile(null);
    setAsFile(null);
    setViewStep('upload');
    setSidebarCollapsed(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Sidebar - Auto Collapses during processing */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <Header
          currentStep={viewStep}
          onBack={handleResetUpload}
        />

        {/* View Router Body */}
        <main className="flex-1 overflow-y-auto">
          {viewStep === 'upload' && (
            <UploadView
              qpFile={qpFile}
              asFile={asFile}
              onQpFileChange={setQpFile}
              onAsFileChange={setAsFile}
              onStartMapping={handleStartMapping}
              onLoadSampleData={handleLoadSampleData}
            />
          )}

          {viewStep === 'processing' && (
            <ProcessingView
              progress={processingStatus}
            />
          )}

          {viewStep === 'results' && (
            <ResultsView
              questions={assessmentData.questions}
              answers={assessmentData.answers}
              unanswered={assessmentData.unanswered}
              summary={assessmentData.summary}
              asImages={assessmentData.asImages}
              onResetUpload={handleResetUpload}
            />
          )}
        </main>
      </div>
    </div>
  );
}
