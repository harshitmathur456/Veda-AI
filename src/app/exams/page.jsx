'use client';

import React, { useState, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import UploadView from '@/components/upload/UploadView';
import ProcessingView from '@/components/processing/ProcessingView';
import ResultsView from '@/components/results/ResultsView';

import { convertFileToImages, extractDigitalTextFromPDF } from '@/lib/pdfUtils';
import { processAssessmentWithGemini } from '@/lib/gemini';

export default function ExamsPage() {
  const [viewStep, setViewStep] = useState('upload'); // 'upload' | 'processing' | 'results'
  const [qpFile, setQpFile] = useState(null);
  const [asFile, setAsFile] = useState(null);

  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState(null);

  const [processingStatus, setProcessingStatus] = useState({ stage: 1, text: 'Starting pipeline...' });
  const [pipelineError, setPipelineError] = useState(null);

  // Cache converted images so retry doesn't re-rasterize
  const cachedImagesRef = useRef({ qpImages: null, asImages: null });

  const [assessmentData, setAssessmentData] = useState({
    questions: [],
    answers: [],
    unanswered: [],
    summary: null,
    asImages: []
  });

  const executeMappingFlow = async (targetQp, targetAs, useCache = false) => {
    if (!targetQp || !targetAs) return;

    console.log('[ExamsPage] Processing Upload Files:', {
      qpFileName: targetQp.name,
      qpFileSize: targetQp.size,
      asFileName: targetAs.name,
      asFileSize: targetAs.size,
    });

    setViewStep('processing');
    setPipelineError(null);

    try {
      let qpImages, asImages;

      if (useCache && cachedImagesRef.current.qpImages && cachedImagesRef.current.asImages) {
        // On retry, reuse already-rasterized images
        console.log('[ExamsPage] Using cached page images for retry');
        qpImages = cachedImagesRef.current.qpImages;
        asImages = cachedImagesRef.current.asImages;
        setProcessingStatus({ stage: 1, text: 'Using cached page images...' });
      } else {
        // Step 1: Convert uploaded files to page images for the Gemini vision pipeline
        setProcessingStatus({ stage: 1, text: 'Rasterizing PDF / Image pages...' });
        qpImages = await convertFileToImages(targetQp);
        asImages = await convertFileToImages(targetAs);

        console.log('[ExamsPage] Converted file pages to images:', {
          qpPageImagesCount: qpImages.length,
          asPageImagesCount: asImages.length,
        });

        if (!qpImages.length || !asImages.length) {
          throw new Error('File page conversion failed — could not generate images from uploaded files.');
        }

        // Cache for potential retry
        cachedImagesRef.current = { qpImages, asImages };
      }

        // Extract digital text layer for Question Paper if available (to skip vision rendering tokens for digital PDFs)
        const qpText = await extractDigitalTextFromPDF(targetQp);

        // Step 2: Send page images/text through the 3-stage Gemini pipeline
        setProcessingStatus({ stage: 1, text: 'Sending files to AI engine...' });
        const result = await processAssessmentWithGemini(qpImages, asImages, (status) => {
          setProcessingStatus(status);
        }, { qpText });

      console.log('[ExamsPage] Raw API Result Received Immediately Before Rendering:', {
        qpFileName: targetQp.name,
        asFileName: targetAs.name,
        totalQuestionsExtracted: result.questions?.length,
        extractedQuestionIds: result.questions?.map(q => q.id),
        attemptedCount: result.summary?.attemptedCount,
        totalScore: `${result.summary?.totalMarksObtained}/${result.summary?.totalMaxMarks}`,
      });

      setAssessmentData({
        ...result,
        asImages,
        qpFileName: targetQp.name,
        asFileName: targetAs.name
      });

      setViewStep('results');
    } catch (error) {
      console.error('[ExamsPage] Pipeline processing failed:', error);

      const msg = (error.message || '').toLowerCase();
      const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate limit') || msg.includes('too many tokens') || msg.includes('too many requests');

      if (isQuota) {
        setPipelineError('too many requests try again later');
      } else {
        const errorMessage = error.message || 'Unknown pipeline error';
        setPipelineError(`${errorMessage}. Please retry or upload different files.`);
      }
      // Stay on 'processing' view — ProcessingView will render the error card
    }
  };

  const handleStartMapping = () => {
    executeMappingFlow(qpFile, asFile);
  };

  const handleRetryPipeline = () => {
    console.log('[ExamsPage] Retrying pipeline with same files...');
    executeMappingFlow(qpFile, asFile, true /* useCache */);
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
    setPipelineError(null);
    cachedImagesRef.current = { qpImages: null, asImages: null };
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
          error={pipelineError}
          onRetry={handleRetryPipeline}
          onNewUpload={handleResetUpload}
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
