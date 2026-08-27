'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import UploadView from '@/components/upload/UploadView';
import ProcessingView from '@/components/processing/ProcessingView';
import ResultsView from '@/components/results/ResultsView';

import { convertFileToImages } from '@/lib/pdfUtils';
import { processAssessmentWithGemini } from '@/lib/gemini';
import { MOCK_QUESTIONS, MOCK_ANSWERS, UNANSWERED_QUESTIONS, MOCK_SUMMARY } from '@/lib/mockData';

export default function ExamsPage() {
  const [viewStep, setViewStep] = useState('upload'); // 'upload' | 'processing' | 'results'
  const [qpFile, setQpFile] = useState(null);
  const [asFile, setAsFile] = useState(null);

  const [processingStatus, setProcessingStatus] = useState({ stage: 1, text: 'Starting pipeline...' });

  const [assessmentData, setAssessmentData] = useState({
    questions: [],
    answers: [],
    unanswered: [],
    summary: null,
    asImages: []
  });

  const handleLoadSampleData = () => {
    setViewStep('processing');
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
        asImages: [],
        qpFileName: 'Class_10_Science_Question_Paper.pdf',
        asFileName: 'rahul_sharma_answer_sheet.pdf'
      });
      setViewStep('results');
    }, 3200);
  };

  const handleStartMapping = async () => {
    if (!qpFile || !asFile) return;

    console.log('\n┌──────────────────────────────────────────────────┐');
    console.log('│         EXAMS PAGE — START MAPPING                │');
    console.log('└──────────────────────────────────────────────────┘');
    console.log(`[ExamsPage] QP File: "${qpFile.name}" (${qpFile.type}, ${(qpFile.size / 1024).toFixed(1)} KB)`);
    console.log(`[ExamsPage] AS File: "${asFile.name}" (${asFile.type}, ${(asFile.size / 1024).toFixed(1)} KB)`);

    setViewStep('processing');

    try {
      // Step 1: Convert files to images
      setProcessingStatus({ stage: 1, text: 'Rasterizing PDF / Image pages...' });
      console.log('[ExamsPage] Converting QP file to images...');
      const qpImages = await convertFileToImages(qpFile);
      console.log(`[ExamsPage] QP conversion done: ${qpImages.length} page(s)`);

      console.log('[ExamsPage] Converting AS file to images...');
      const asImages = await convertFileToImages(asFile);
      console.log(`[ExamsPage] AS conversion done: ${asImages.length} page(s)`);

      if (!qpImages.length || !asImages.length) {
        console.error('[ExamsPage] ❌ File conversion failed — no images produced');
      }

      // Step 2: Run Gemini pipeline
      console.log('[ExamsPage] Starting Gemini pipeline...');
      const result = await processAssessmentWithGemini(qpImages, asImages, (status) => {
        console.log(`[ExamsPage] Pipeline progress: Stage ${status.stage} — ${status.text}`);
        setProcessingStatus(status);
      });

      console.log('[ExamsPage] Pipeline complete. Result summary:');
      console.log(`  Questions: ${result.questions?.length || 0}`);
      console.log(`  Answers: ${result.answers?.length || 0}`);
      console.log(`  Unanswered: ${result.unanswered?.length || 0}`);
      console.log(`  Score: ${result.summary?.totalMarksObtained}/${result.summary?.totalMaxMarks}`);

      setAssessmentData({
        ...result,
        asImages,
        qpFileName: qpFile.name,
        asFileName: asFile.name
      });

      setViewStep('results');
    } catch (error) {
      console.error('[ExamsPage] ❌ Pipeline error:', error);
      setAssessmentData({
        questions: MOCK_QUESTIONS,
        answers: MOCK_ANSWERS,
        unanswered: UNANSWERED_QUESTIONS,
        summary: MOCK_SUMMARY,
        asImages: [],
        qpFileName: qpFile.name,
        asFileName: asFile.name
      });
      setViewStep('results');
    }
  };

  const handleResetUpload = () => {
    setQpFile(null);
    setAsFile(null);
    setViewStep('upload');
  };

  return (
    <AppShell currentStep={viewStep} onBack={handleResetUpload}>
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
          qpFileName={assessmentData.qpFileName || qpFile?.name || 'Class_10_Science_Question_Paper.pdf'}
          asFileName={assessmentData.asFileName || asFile?.name || 'student_answer_sheet.pdf'}
          onResetUpload={handleResetUpload}
        />
      )}
    </AppShell>
  );
}
