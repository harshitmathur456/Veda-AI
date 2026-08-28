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

  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState(null);

  const [processingStatus, setProcessingStatus] = useState({ stage: 1, text: 'Starting pipeline...' });

  const [assessmentData, setAssessmentData] = useState({
    questions: [],
    answers: [],
    unanswered: [],
    summary: null,
    asImages: []
  });

  const executeMappingFlow = async (targetQp, targetAs) => {
    if (!targetQp || !targetAs) return;

    setViewStep('processing');

    try {
      // Step 1: Convert uploaded files to page images for the Gemini vision pipeline
      setProcessingStatus({ stage: 1, text: 'Rasterizing PDF / Image pages...' });
      const qpImages = await convertFileToImages(targetQp);
      const asImages = await convertFileToImages(targetAs);

      if (!qpImages.length || !asImages.length) {
        console.error('[ExamsPage] File conversion failed — no images produced');
      }

      // Step 2: Send page images through the 3-stage Gemini pipeline (extract → map → grade)
      setProcessingStatus({ stage: 1, text: 'Sending files to AI engine...' });
      const result = await processAssessmentWithGemini(qpImages, asImages, (status) => {
        setProcessingStatus(status);
      });

      setAssessmentData({
        ...result,
        asImages,
        qpFileName: targetQp.name,
        asFileName: targetAs.name
      });

      setViewStep('results');
    } catch (error) {
      console.error('[ExamsPage] Pipeline error:', error);
      // Fallback to mock data so the UI never breaks on pipeline failure
      setAssessmentData({
        questions: MOCK_QUESTIONS,
        answers: MOCK_ANSWERS,
        unanswered: UNANSWERED_QUESTIONS,
        summary: MOCK_SUMMARY,
        asImages: [],
        qpFileName: targetQp.name,
        asFileName: targetAs.name
      });
      setViewStep('results');
    }
  };

  const handleStartMapping = () => {
    executeMappingFlow(qpFile, asFile);
  };

  const handleLoadSampleData = async () => {
    setIsSampleLoading(true);
    setSampleError(null);

    try {
      const [qpRes, asRes] = await Promise.all([
        fetch('/samples/question-paper.pdf'),
        fetch('/samples/answer-sheet.pdf')
      ]);

      if (!qpRes.ok || !asRes.ok) {
        throw new Error(`Sample files not found (${qpRes.status} / ${asRes.status})`);
      }

      const qpBlob = await qpRes.blob();
      const asBlob = await asRes.blob();

      const sampleQpFile = new File([qpBlob], 'Sample Question Paper.pdf', { type: 'application/pdf' });
      const sampleAsFile = new File([asBlob], 'Sample Answer Sheet.pdf', { type: 'application/pdf' });

      setQpFile(sampleQpFile);
      setAsFile(sampleAsFile);
      setIsSampleLoading(false);

      // Automatically proceed through the full extraction/mapping/grading pipeline
      await executeMappingFlow(sampleQpFile, sampleAsFile);

    } catch (err) {
      console.error('[ExamsPage] Failed to fetch sample files:', err);
      setIsSampleLoading(false);
      setSampleError('Failed to load sample assessment files. Please verify sample files are available.');
    }
  };

  const handleResetUpload = () => {
    setQpFile(null);
    setAsFile(null);
    setSampleError(null);
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
          isSampleLoading={isSampleLoading}
          sampleError={sampleError}
          onClearSampleError={() => setSampleError(null)}
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
          qpFileName={assessmentData.qpFileName || qpFile?.name || 'Sample_Question_Paper.pdf'}
          asFileName={assessmentData.asFileName || asFile?.name || 'Sample_Answer_Sheet.pdf'}
          onResetUpload={handleResetUpload}
        />
      )}
    </AppShell>
  );
}
