/**
 * Client-side pipeline orchestrator.
 * Sends uploaded images to the server-side API route (/api/process-assessment)
 * and streams progress updates back via NDJSON.
 *
 * The Gemini SDK runs ONLY on the server — never in the browser.
 */

const PIPELINE_TIMEOUT_MS = 90_000; // 90 seconds

/**
 * Process Question Paper & Answer Sheet via the server-side Gemini pipeline.
 * @param {Array<{page: number, base64: string}>} qpImages
 * @param {Array<{page: number, base64: string}>} asImages
 * @param {function} onProgressCallback
 */
export async function processAssessmentWithGemini(qpImages, asImages, onProgressCallback = () => {}) {
  if (!qpImages?.length || !asImages?.length) {
    console.error('[Client Pipeline] Missing required images: QP page count =', qpImages?.length, 'AS page count =', asImages?.length);
    throw new Error('Failed to process uploaded files: No page images were generated.');
  }

  console.log('[Client Pipeline] Starting assessment processing for QP pages:', qpImages.length, '| AS pages:', asImages.length);
  onProgressCallback({ stage: 1, text: 'Sending files to AI engine...' });

  // Enforce a hard timeout so the UI never hangs indefinitely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error(`[Client Pipeline] Timeout after ${PIPELINE_TIMEOUT_MS / 1000}s — aborting request`);
    controller.abort();
  }, PIPELINE_TIMEOUT_MS);

  try {
    const response = await fetch('/api/process-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qpImages, asImages }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API returned ${response.status}: ${errText}`);
    }

    // Stream NDJSON progress updates from the server pipeline
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
            onProgressCallback({ stage: msg.stage, text: msg.text });
          } else if (msg.type === 'result') {
            finalResult = msg.data;
          } else if (msg.type === 'error') {
            console.error('[Client Pipeline] Server pipeline error:', msg.error);
            throw new Error(msg.error);
          }
        } catch (parseErr) {
          // Re-throw actual pipeline errors; ignore NDJSON parse issues
          if (parseErr.message?.includes('Server error') || parseErr.message?.includes('Stage') || parseErr.message?.includes('failed') || parseErr.message?.includes('All Gemini')) {
            throw parseErr;
          }
        }
      }
    }

    if (!finalResult) {
      throw new Error('Pipeline completed but no result was received from AI server.');
    }

    console.log('[Client Pipeline] Assessment processing successfully completed!', {
      questionsCount: finalResult.questions?.length,
      answersCount: finalResult.answers?.length,
      summary: finalResult.summary,
    });

    return finalResult;

  } catch (err) {
    // Map AbortError to a user-friendly timeout message
    if (err.name === 'AbortError') {
      const timeoutMsg = `Request timed out after ${PIPELINE_TIMEOUT_MS / 1000} seconds. The AI server may be overloaded — please retry.`;
      console.error('[Client Pipeline] AbortError (timeout):', timeoutMsg);
      onProgressCallback({ stage: 0, text: `Pipeline Error: ${timeoutMsg}` });
      throw new Error(timeoutMsg);
    }

    const isFetchErr = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
    const friendlyErrMsg = isFetchErr
      ? 'Connection failed (server offline or network error)'
      : err.message || 'Unknown pipeline error';

    console.error('[Client Pipeline] Critical pipeline error:', friendlyErrMsg);

    onProgressCallback({
      stage: 0,
      text: `Pipeline Error: ${friendlyErrMsg}`,
    });

    throw new Error(friendlyErrMsg);
  } finally {
    clearTimeout(timeoutId);
  }
}
