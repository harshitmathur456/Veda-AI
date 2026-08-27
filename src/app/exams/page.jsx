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
        asImages: []
      });
      setViewStep('results');
    }, 3200);
  };

  const handleStartMapping = async () => {
    if (!qpFile || !asFile) return;

    setViewStep('processing');

    try {
      setProcessingStatus({ stage: 1, text: 'Rasterizing PDF / Image pages...' });
      const qpImages = await convertFileToImages(qpFile);
      const asImages = await convertFileToImages(asFile);

      const result = await processAssessmentWithGemini(qpImages, asImages, (status) => {
        setProcessingStatus(status);
      });

      setAssessmentData({
        ...result,
        asImages
      });

      setViewStep('results');
    } catch (error) {
      console.error("Pipeline error:", error);
      setAssessmentData({
        questions: MOCK_QUESTIONS,
        answers: MOCK_ANSWERS,
        unanswered: UNANSWERED_QUESTIONS,
        summary: MOCK_SUMMARY,
        asImages: []
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
          onResetUpload={handleResetUpload}
        />
      )}
    </AppShell>
  );
}
