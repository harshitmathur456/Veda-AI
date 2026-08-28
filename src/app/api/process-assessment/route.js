import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// ─── Server-side only — API key never exposed to browser ─────────────────
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

/**
 * Try each model in sequence until one returns a valid response.
 * This fallback chain handles model availability changes and rate limits
 * without requiring manual config updates.
 */
async function callGeminiVision(contents) {
  let lastError;
  for (const modelName of [MODEL_ID, ...FALLBACK_MODELS.filter(m => m !== MODEL_ID)]) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

export const maxDuration = 120; // 2 minutes for long extractions

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Extract JSON from Gemini's response text, which may contain markdown fences
 * or leading/trailing prose. Tries array match first, then object match.
 */
function extractJSON(text) {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch (e) {
      console.error('[API] JSON array parse failed:', e.message);
    }
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch (e) {
      console.error('[API] JSON object parse failed:', e.message);
    }
  }

  console.error('[API] Could not extract JSON from response');
  return null;
}

function buildImageParts(pageImages) {
  return pageImages.map((img) => {
    const match = img.base64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      return { inlineData: { mimeType: match[1], data: match[2] } };
    }
    return { inlineData: { mimeType: 'image/png', data: img.base64 } };
  });
}

/**
 * Post-process: trim bounding boxes so consecutive answers on the same page
 * don't overlap. If bbox[i].ymax > bbox[i+1].ymin, clamp it down.
 * This prevents the answer viewer from showing overlapping highlight regions
 * when Gemini's bbox estimates are slightly too generous.
 */
function trimOverlappingBboxes(answers) {
  const byPage = {};
  answers.forEach(a => {
    const p = a.page || 1;
    if (!byPage[p]) byPage[p] = [];
    byPage[p].push(a);
  });

  Object.values(byPage).forEach(pageAnswers => {
    pageAnswers.sort((a, b) => (a.bbox?.ymin || 0) - (b.bbox?.ymin || 0));
    for (let i = 0; i < pageAnswers.length - 1; i++) {
      const curr = pageAnswers[i];
      const next = pageAnswers[i + 1];
      if (curr.bbox && next.bbox && curr.bbox.ymax > next.bbox.ymin) {
        // Leave a 1% gap between consecutive answer regions
        const gap = 1;
        curr.bbox.ymax = Math.max(curr.bbox.ymin + 2, next.bbox.ymin - gap);
      }
    }
  });

  return answers;
}


// ─── Stage 1: Extract Questions ──────────────────────────────────────────

async function extractQuestions(qpImages) {
  const prompt = `You are an expert exam paper analyzer. Look at the attached question paper image(s) carefully.

Extract EVERY question in the exact order they appear. For questions with sub-parts (like 11a, 11b), create a separate entry for each sub-part.

Return ONLY a valid JSON array. Each element must have this exact schema:
[
  {
    "id": "q1",
    "qNo": "1",
    "subPart": null,
    "text": "Full exact question text as printed on the paper",
    "maxMarks": 5,
    "page": 1
  }
]

Rules:
- "id" must be unique: "q1", "q2", "q3"... For sub-parts: "q11_a", "q11_b".
- "qNo" is the printed question number as a string.
- "subPart" is null if no sub-part, otherwise "a.", "b.", etc.
- "text" must be the COMPLETE question text exactly as printed. Do NOT truncate.
- "maxMarks" from the paper if visible. If not visible, estimate.
- "page" is which image (1-indexed) the question appears on.

Return ONLY the JSON array. No explanation, no markdown fences.`;

  const imageParts = buildImageParts(qpImages);

  const response = await callGeminiVision([
    { role: 'user', parts: [{ text: prompt }, ...imageParts] }
  ]);

  const questions = extractJSON(response.text);
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Stage 1 failed: no questions extracted from response');
  }

  return questions;
}


// ─── Stage 2: Extract Handwritten Answers ────────────────────────────────

async function extractAnswers(asImages, questions) {
  const questionsSummary = questions.map(q =>
    `Q${q.qNo}${q.subPart || ''} (id: ${q.id}): "${q.text.substring(0, 100)}"`
  ).join('\n');

  /**
   * The bbox instructions are critical for the answer viewer overlay.
   * Each answer's bounding box must end where the next answer begins,
   * so the highlight rectangles don't overlap on the answer sheet image.
   */
  const prompt = `You are an expert at reading handwritten student answer sheets. Analyze the attached handwritten answer sheet image(s).

Here are the questions from the question paper:
${questionsSummary}

For EACH handwritten answer visible on the answer sheet:
1. Read the handwritten text carefully, even if messy.
2. Match it to the correct question by the question number the student wrote, or by content.
3. Estimate a TIGHT bounding box for that answer as percentage coordinates (0-100).

CRITICAL bounding box rules:
- The bounding box for each answer must END exactly where the NEXT question's answer begins.
- Do NOT include any text or content that belongs to the next question's answer.
- If Q2's answer starts at y=35% and Q3's answer starts at y=55%, then Q2's ymax should be approximately 54% (1% margin before Q3 starts).
- Each bbox should tightly enclose ONLY that specific answer's handwritten content.

Return ONLY a valid JSON array:
[
  {
    "id": "ans_q1",
    "questionId": "q1",
    "page": 1,
    "bbox": { "ymin": 5, "xmin": 3, "ymax": 30, "xmax": 97 },
    "extractedText": "Full transcribed handwritten answer"
  }
]

Rules:
- "id": "ans_" + question id (e.g. "ans_q1", "ans_q11_a")
- "questionId": must match a question id from above
- "page": which answer sheet page (1-indexed)
- "bbox": percentage coordinates (0-100). ymin=top, ymax=bottom, xmin=left, xmax=right. TIGHT fit only.
- "extractedText": FULL transcription of the handwritten answer. For diagrams: "[Diagram: description]"
- Omit unanswered questions entirely

Return ONLY the JSON array.`;

  const imageParts = buildImageParts(asImages);

  const response = await callGeminiVision([
    { role: 'user', parts: [{ text: prompt }, ...imageParts] }
  ]);

  const answers = extractJSON(response.text);
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error('Stage 2 failed: no answers extracted from response');
  }

  // Post-process: trim overlapping bboxes so the answer viewer renders cleanly
  return trimOverlappingBboxes(answers);
}


// ─── Stage 3: Grade & Map ────────────────────────────────────────────────

async function gradeAndMap(questions, answers) {
  const payload = {
    questions: questions.map(q => ({ id: q.id, qNo: q.qNo, subPart: q.subPart, text: q.text, maxMarks: q.maxMarks })),
    answers: answers.map(a => ({ id: a.id, questionId: a.questionId, extractedText: a.extractedText })),
  };

  /**
   * The grading prompt uses a structured evaluation rubric to prevent the common
   * failure mode where Gemini gives full marks for any written answer. The rubric
   * forces per-question-type evaluation with explicit deduction rules.
   */
  const prompt = `You are a strict academic exam evaluator and subject matter expert. Grade each student answer against its corresponding question.

CRITICAL EVALUATION MANDATE:
Evaluate the answer for factual correctness, accuracy, and completeness relative to the question asked.
Do NOT give full marks simply because an answer was written — award marks based on how much of the expected correct content is present, accurate, and relevant.
- A vague, incomplete, or partially incorrect answer MUST receive partial marks.
- A wrong, incorrect, or irrelevant answer MUST receive ZERO marks (0), even if text is written.
- Only a complete, factually accurate answer covering all key points receives full marks.

STRUCTURED EVALUATION RUBRIC BY QUESTION TYPE:
1. Short-Answer / Definition Questions:
   - Check for essential key technical terms and concepts that MUST be present.
   - Example: For "What is data communication?", answer MUST mention: (a) exchange/transmission of data, (b) between devices, (c) via a transmission medium/network. If missing key terms, deduct marks proportionately.
2. Process / Multi-Step / Algorithmic Questions:
   - Check that all key steps are present, factually accurate, and in logically correct sequential order.
   - Deduct marks for missing steps, wrong sequence, or incorrect logic.
3. Diagram / Labeling / Technical Structure Questions:
   - Check if key components, labels, protocols, or functional relationships are correctly named and described in text.

GRADED DATA INPUT:
${JSON.stringify(payload, null, 2)}

Return ONLY a valid JSON object matching this schema:
{
  "gradedAnswers": [
    {
      "id": "ans_q1",
      "questionId": "q1",
      "marks": 2,
      "maxMarks": 2,
      "verdict": "correct",
      "confidence": 0.95,
      "status": "matched",
      "rationale": "One concise sentence stating why this exact score was awarded, referencing key terms present or missing.",
      "feedback": "2-3 sentences of detailed, constructive teacher feedback."
    }
  ],
  "unanswered": ["q5"],
  "summary": {
    "totalMarksObtained": 14,
    "totalMaxMarks": 20,
    "percentage": 70.0,
    "attemptedCount": 8,
    "totalQuestions": 10,
    "unansweredCount": 2,
    "unmatchedCount": 0,
    "strengths": ["Data Communication concepts"],
    "weakAreas": ["Topology definitions"],
    "overallTeacherNote": "Comprehensive overall summary of student's actual subject mastery."
  }
}

VERDICT RULES:
- "correct": 80-100% of maxMarks
- "partial": 30-79% of maxMarks
- "incorrect": 0-29% of maxMarks

RATIONALE RULE:
"rationale" MUST be exactly ONE concise sentence stating what key points were correct and what key points were missing or wrong to justify the awarded score.

Return ONLY the JSON object. No extra text or markdown.`;

  const response = await callGeminiVision([
    { role: 'user', parts: [{ text: prompt }] }
  ]);

  const result = extractJSON(response.text);
  if (!result || !result.gradedAnswers) {
    throw new Error('Stage 3 failed: no grading result in response');
  }

  return result;
}


// ─── API Route Handler ───────────────────────────────────────────────────

export async function POST(request) {
  if (!ai) {
    console.error('[API] No Gemini API key configured');
    return NextResponse.json(
      { success: false, error: 'No Gemini API key configured. Set GEMINI_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { qpImages, asImages } = body;

  if (!qpImages?.length || !asImages?.length) {
    return NextResponse.json(
      { success: false, error: `Missing images: QP=${qpImages?.length || 0}, AS=${asImages?.length || 0}` },
      { status: 400 }
    );
  }

  // ─── Use streaming NDJSON for real-time progress updates to the client ───
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        // Stage 1: Extract structured question data from the question paper
        send({ type: 'progress', stage: 1, text: 'Extracting questions from question paper...' });
        const questions = await extractQuestions(qpImages);
        send({ type: 'progress', stage: 1, text: `Extracted ${questions.length} questions` });

        // Stage 2: Read handwritten answers and estimate bounding boxes
        send({ type: 'progress', stage: 2, text: `Reading handwritten answers from ${asImages.length} page(s)...` });
        const rawAnswers = await extractAnswers(asImages, questions);
        send({ type: 'progress', stage: 2, text: `Extracted ${rawAnswers.length} answers` });

        // Stage 3: Grade each answer against its question with detailed feedback
        send({ type: 'progress', stage: 3, text: 'Grading answers & generating AI feedback...' });
        const gradingResult = await gradeAndMap(questions, rawAnswers);

        // Merge grading verdicts with spatial bbox data from Stage 2
        // so the answer viewer can highlight the correct region on the sheet
        const mergedAnswers = gradingResult.gradedAnswers.map((graded) => {
          const rawAns = rawAnswers.find(a => a.id === graded.id || a.questionId === graded.questionId);
          return {
            ...graded,
            page: rawAns?.page || 1,
            bbox: rawAns?.bbox || { ymin: 0, xmin: 0, ymax: 10, xmax: 100 },
            extractedText: rawAns?.extractedText || graded.extractedText || '',
          };
        });

        const answeredQIds = new Set(mergedAnswers.map(a => a.questionId));
        const unansweredIds = gradingResult.unanswered || questions.filter(q => !answeredQIds.has(q.id)).map(q => q.id);

        send({ type: 'progress', stage: 4, text: 'Assessment complete!' });

        send({
          type: 'result',
          data: {
            questions,
            answers: mergedAnswers,
            unanswered: unansweredIds,
            summary: gradingResult.summary,
          },
        });

      } catch (err) {
        console.error('[API] Pipeline error:', err);
        send({ type: 'error', error: err.message || 'Unknown pipeline error' });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}
