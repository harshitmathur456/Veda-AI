/**
 * Client-side pipeline orchestrator.
 * Sends uploaded images to the server-side API route (/api/process-assessment)
 * and streams progress updates back via NDJSON.
 *
 * The Gemini SDK runs ONLY on the server — never in the browser.
 */

import { MOCK_QUESTIONS, MOCK_ANSWERS, UNANSWERED_QUESTIONS, MOCK_SUMMARY } from './mockData';

/**
 * Process Question Paper & Answer Sheet via the server-side Gemini pipeline.
 * @param {Array<{page: number, base64: string}>} qpImages
 * @param {Array<{page: number, base64: string}>} asImages
 * @param {function} onProgressCallback
 */
export async function processAssessmentWithGemini(qpImages, asImages, onProgressCallback = () => {}) {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  CLIENT — Sending to /api/process-assessment     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`QP images: ${qpImages?.length || 0}, AS images: ${asImages?.length || 0}`);

  if (!qpImages?.length || !asImages?.length) {
    console.error('[Client] No images to process');
    onProgressCallback({ stage: 4, text: 'No images — using sample data' });
    return { questions: MOCK_QUESTIONS, answers: MOCK_ANSWERS, unanswered: UNANSWERED_QUESTIONS, summary: MOCK_SUMMARY };
  }

  onProgressCallback({ stage: 1, text: 'Sending files to AI engine...' });

  try {
    const response = await fetch('/api/process-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qpImages, asImages }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API returned ${response.status}: ${errText}`);
    }

    // Stream NDJSON progress updates
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);

          if (msg.type === 'progress') {
            console.log(`[Client] Stage ${msg.stage}: ${msg.text}`);
            onProgressCallback({ stage: msg.stage, text: msg.text });
          } else if (msg.type === 'result') {
            console.log('[Client] ✅ Received final result');
            console.log(`  Questions: ${msg.data?.questions?.length}`);
            console.log(`  Answers: ${msg.data?.answers?.length}`);
            console.log(`  Score: ${msg.data?.summary?.totalMarksObtained}/${msg.data?.summary?.totalMaxMarks}`);
            finalResult = msg.data;
          } else if (msg.type === 'error') {
            console.error('[Client] ❌ Server error:', msg.error);
            throw new Error(msg.error);
          }
        } catch (parseErr) {
          if (parseErr.message?.includes('Server error') || parseErr.message?.includes('Stage')) {
            throw parseErr; // Re-throw pipeline errors
          }
          console.warn('[Client] Failed to parse NDJSON line:', line.substring(0, 100));
        }
      }
    }

    if (!finalResult) {
      throw new Error('Pipeline completed but no result received');
    }

    return finalResult;

  } catch (err) {
    const isFetchErr = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
    const friendlyErrMsg = isFetchErr
      ? 'Connection failed (server offline or network error)'
      : err.message || 'Unknown pipeline error';

    console.warn('[Client] ⚠ Pipeline issue encountered:', friendlyErrMsg);

    onProgressCallback({
      stage: 0,
      text: `${friendlyErrMsg}. Loading sample evaluation data...`,
    });

    await new Promise(r => setTimeout(r, 1500));

    return {
      questions: MOCK_QUESTIONS,
      answers: MOCK_ANSWERS,
      unanswered: UNANSWERED_QUESTIONS,
      summary: MOCK_SUMMARY,
    };
  }
}
