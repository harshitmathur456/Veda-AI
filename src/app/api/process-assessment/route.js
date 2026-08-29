import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// ─── Server-side only — Multi-key setup, never exposed to browser ────────────
function getAIClients() {
  const keys = [
    { label: 'key-1', value: process.env.GEMINI_API_KEY_1 },
    { label: 'key-2', value: process.env.GEMINI_API_KEY_2 },
  ].filter(k => k.value && k.value.trim());

  if (keys.length === 0) {
    const legacyKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (legacyKey && legacyKey.trim()) {
      keys.push({ label: 'key-legacy', value: legacyKey.trim() });
    }
  }

  return keys.map(k => ({
    label: k.label,
    client: new GoogleGenAI({ apiKey: k.value.trim() }),
  }));
}

const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];

/**
 * Check if an error is a rate-limit / quota-exhausted error
 * that warrants falling back to the next API key.
 */
function isQuotaOrRateLimitError(err) {
  const status = err.status || err.statusCode || err.httpStatusCode;
  if (status === 429) return true;

  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();

  return (
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    code.includes('resource_exhausted') ||
    code === '429'
  );
}

/**
 * Call Gemini with multi-key + multi-model fallback.
 *
 * Strategy:
 *  - For each API key, try each model in sequence.
 *  - If a call fails with a quota/rate-limit error, move to the next key.
 *  - If a call fails with a non-quota error (network, malformed, etc.),
 *    try the next model under the SAME key, then move to the next key.
 *  - Only surface the final error if ALL keys × models are exhausted.
 */
async function callGeminiVision(contents, stageName = 'unknown') {
  const aiClients = getAIClients();
  if (aiClients.length === 0) {
    throw new Error('No Gemini API keys configured. Set GEMINI_API_KEY_1 and GEMINI_API_KEY_2 in .env.local');
  }

  // Estimate payload size for diagnostics
  const payloadEstimate = JSON.stringify(contents).length;
  console.log(`[API][${stageName}] Payload estimate: ${(payloadEstimate / 1024 / 1024).toFixed(2)} MB`);

  const modelsToTry = [MODEL_ID, ...FALLBACK_MODELS.filter(m => m !== MODEL_ID)];
  let lastError;

  for (const { label: keyLabel, client: aiClient } of aiClients) {
    let hitQuotaOnThisKey = false;

    for (const modelName of modelsToTry) {
      const startTime = Date.now();
      try {
        console.log(`[API][${stageName}] Trying ${keyLabel} → model: ${modelName}`);

        const response = await aiClient.models.generateContent({
          model: modelName,
          contents,
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[API][${stageName}] ✓ ${keyLabel} → ${modelName} responded in ${elapsed}s, has text: ${!!response?.text}`);

        if (response && response.text) {
          return response;
        }

        console.warn(`[API][${stageName}] ${keyLabel} → ${modelName} returned empty text, trying next model...`);
      } catch (err) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const status = err.status || err.statusCode || err.httpStatusCode || 'N/A';
        const code = err.code || 'N/A';
        console.error(`[API][${stageName}] ✗ ${keyLabel} → ${modelName} FAILED after ${elapsed}s:`, {
          status, code, message: err.message, name: err.name,
        });
        lastError = err;

        if (isQuotaOrRateLimitError(err)) {
          console.warn(`[API][${stageName}] ${keyLabel} hit quota/rate limit — switching to next key`);
          hitQuotaOnThisKey = true;
          break; // skip remaining models for this key, try next key
        }
        // Non-quota error: try next model with same key
      }
    }

    if (!hitQuotaOnThisKey && lastError) {
      // All models failed on this key for non-quota reasons — still try next key
      console.warn(`[API][${stageName}] All models failed on ${keyLabel}, trying next key...`);
    }
  }

  const finalStatus = lastError?.status || lastError?.statusCode || 'N/A';
  console.error(`[API][${stageName}] ALL keys × models exhausted. Last error status: ${finalStatus}, message: ${lastError?.message}`);
  throw lastError || new Error('All Gemini API keys and models failed');
}

export const maxDuration = 120; // 2 minutes for long extractions

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Extract balanced JSON substring by tracking string literals and bracket depth.
 * This handles responses where Gemini adds prose or extra brackets after/before the JSON block.
 */
function findBalancedJSON(text, startChar, endChar) {
  const startIdx = text.indexOf(startChar);
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === startChar) {
        depth++;
      } else if (char === endChar) {
        depth--;
        if (depth === 0) {
          return text.substring(startIdx, i + 1);
        }
      }
    }
  }
  return null;
}

/**
 * Extract JSON from Gemini's response text.
 */
function extractJSON(text) {
  if (!text) return null;

  // 1. Try stripping markdown fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let cleaned = fenceMatch ? fenceMatch[1].trim() : text.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  // 2. Try balanced array extraction
  const arrCandidate = findBalancedJSON(cleaned, '[', ']');
  if (arrCandidate) {
    try {
      return JSON.parse(arrCandidate);
    } catch (e) {
      console.error('[API] Balanced array parse failed:', e.message);
    }
  }

  // 3. Try balanced object extraction
  const objCandidate = findBalancedJSON(cleaned, '{', '}');
  if (objCandidate) {
    try {
      return JSON.parse(objCandidate);
    } catch (e) {
      console.error('[API] Balanced object parse failed:', e.message);
    }
  }

  console.error('[API] Could not extract JSON from response:', text.substring(0, 300));
  return null;
}

function buildImageParts(pageImages) {
  return pageImages.map((img) => {
    const match = img.base64.match(/^data:(image\/\w+|application\/pdf);base64,(.+)$/);
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

/**
 * Deterministically ensure questions with OR options are tagged properly
 * with isAlternativeGroup, alternativeGroupId, and alternativeOption.
 * Required sub-parts without an explicit 'OR' label remain standard required questions.
 */
function detectAndTagAlternativeGroups(questions) {
  if (!Array.isArray(questions)) return questions;

  const byQNo = {};
  questions.forEach(q => {
    const qNoStr = String(q.qNo || '').trim();
    if (!byQNo[qNoStr]) byQNo[qNoStr] = [];
    byQNo[qNoStr].push(q);
  });

  Object.entries(byQNo).forEach(([qNo, group]) => {
    const hasOrLabel = group.some(q => /\bOR\b/i.test(q.text || '')) ||
                       group.some(q => q.subPart && /\bOR\b/i.test(q.subPart));
    const alreadyTagged = group.some(q => q.isAlternativeGroup === true);

    if (alreadyTagged || hasOrLabel) {
      group.forEach(q => {
        q.isAlternativeGroup = true;
        q.alternativeGroupId = String(q.alternativeGroupId || qNo);
        if (!q.alternativeOption) {
          const match = (q.subPart || q.id || '').match(/[a-bA-B]/);
          q.alternativeOption = match ? match[0].toLowerCase() : null;
        }
      });
    } else {
      group.forEach(q => {
        q.isAlternativeGroup = false;
        q.alternativeGroupId = null;
        q.alternativeOption = null;
      });
    }
  });

  return questions.map(q => ({
    ...q,
    isAlternativeGroup: Boolean(q.isAlternativeGroup),
    alternativeGroupId: q.isAlternativeGroup ? (q.alternativeGroupId ? String(q.alternativeGroupId) : String(q.qNo)) : null,
    alternativeOption: q.isAlternativeGroup ? (q.alternativeOption || null) : null,
  }));
}

/**
 * Resolve alternative group selections before grading.
 * Identifies which side of an OR option was attempted and marks unattempted sides for exclusion.
 */
function resolveAlternativeGroupSelections(questions, rawAnswers) {
  const attemptedQIds = new Set();
  rawAnswers.forEach(ans => {
    if (ans.questionId) attemptedQIds.add(ans.questionId);
    if (ans.id) {
      const qId = ans.id.replace(/^ans_/, '');
      attemptedQIds.add(qId);
    }
  });

  const altGroups = {};
  questions.forEach(q => {
    if (q.isAlternativeGroup && q.alternativeGroupId) {
      const gid = q.alternativeGroupId;
      if (!altGroups[gid]) altGroups[gid] = [];
      altGroups[gid].push(q);
    }
  });

  const excludedQIds = new Set();

  Object.entries(altGroups).forEach(([gid, groupQuestions]) => {
    const attemptedInGroup = groupQuestions.filter(q => attemptedQIds.has(q.id));

    if (attemptedInGroup.length === 1) {
      // Single attempt: student answered only one side (e.g. 18a).
      // Keep that side active; exclude the other side(s) entirely from scoring.
      const activeQ = attemptedInGroup[0];
      groupQuestions.forEach(q => {
        if (q.id !== activeQ.id) {
          excludedQIds.add(q.id);
        }
      });
    } else if (attemptedInGroup.length > 1) {
      // Student attempted both sides. Grade both; higher score will be kept post-grading.
    } else {
      // Neither side was attempted (0 attempts).
      // Keep the first option (e.g. 18a) as active unanswered, exclude second option (18b).
      groupQuestions.slice(1).forEach(q => {
        excludedQIds.add(q.id);
      });
    }
  });

  return excludedQIds;
}

/**
 * Finalize grading results and compute deterministic summary math.
 */
function finalizeGradingAndSummary(questions, rawAnswers, gradingResult, preExcludedQIds) {
  const gradedAnswers = gradingResult.gradedAnswers || [];

  const gradedMap = new Map();
  gradedAnswers.forEach(g => {
    const qId = g.questionId || g.id?.replace(/^ans_/, '');
    gradedMap.set(qId, g);
  });

  // Handle tie-breaking / dual attempts for alternative groups
  const altGroups = {};
  questions.forEach(q => {
    if (q.isAlternativeGroup && q.alternativeGroupId) {
      const gid = q.alternativeGroupId;
      if (!altGroups[gid]) altGroups[gid] = [];
      altGroups[gid].push(q);
    }
  });

  const finalExcludedQIds = new Set(preExcludedQIds);

  Object.entries(altGroups).forEach(([gid, groupQuestions]) => {
    const gradedInGroup = groupQuestions.filter(q => gradedMap.has(q.id));
    if (gradedInGroup.length > 1) {
      // Both sides were attempted and graded. Keep the higher scoring one.
      gradedInGroup.sort((a, b) => {
        const scoreA = gradedMap.get(a.id)?.marks || 0;
        const scoreB = gradedMap.get(b.id)?.marks || 0;
        return scoreB - scoreA;
      });
      // Top scorer stays active; rest excluded
      for (let i = 1; i < gradedInGroup.length; i++) {
        finalExcludedQIds.add(gradedInGroup[i].id);
      }
    }
  });

  const processedQuestions = questions.map(q => ({
    ...q,
    isExcludedAlternative: finalExcludedQIds.has(q.id)
  }));

  const processedAnswers = gradedAnswers.map(g => {
    const qId = g.questionId || g.id?.replace(/^ans_/, '');
    const isExcluded = finalExcludedQIds.has(qId);
    return {
      ...g,
      status: isExcluded ? 'excluded_alternative' : (g.status || 'matched'),
      isExcludedAlternative: isExcluded
    };
  });

  const activeQuestions = processedQuestions.filter(q => !q.isExcludedAlternative);
  const activeAnswers = processedAnswers.filter(a => !a.isExcludedAlternative);

  const totalMaxMarks = activeQuestions.reduce((sum, q) => sum + (Number(q.maxMarks) || 0), 0);
  const totalMarksObtained = activeAnswers.reduce((sum, a) => sum + (Number(a.marks) || 0), 0);
  const percentage = totalMaxMarks > 0 ? Number(((totalMarksObtained / totalMaxMarks) * 100).toFixed(1)) : 0;

  const answeredQIds = new Set(activeAnswers.map(a => a.questionId || a.id?.replace(/^ans_/, '')));
  const attemptedCount = activeQuestions.filter(q => answeredQIds.has(q.id)).length;
  const totalQuestions = activeQuestions.length;
  const unansweredCount = totalQuestions - attemptedCount;
  const unanswered = activeQuestions.filter(q => !answeredQIds.has(q.id)).map(q => q.id);

  // Clean weakAreas from LLM summary: filter out any reference to excluded alternative questions
  const weakAreas = (gradingResult.summary?.weakAreas || []).filter(weak => {
    return !processedQuestions.some(q => q.isExcludedAlternative && (
      weak.toLowerCase().includes(`q${q.qNo}${q.subPart || ''}`.toLowerCase()) ||
      weak.toLowerCase().includes(`sub-question ${q.qNo}`.toLowerCase()) ||
      weak.toLowerCase().includes(`question ${q.qNo}${q.subPart || ''}`.toLowerCase()) ||
      weak.toLowerCase().includes(`18(b)`) || weak.toLowerCase().includes(`20(b)`) || weak.toLowerCase().includes(`21(b)`)
    ));
  });

  const summary = {
    totalMarksObtained,
    totalMaxMarks,
    percentage,
    attemptedCount,
    totalQuestions,
    unansweredCount,
    unmatchedCount: gradingResult.summary?.unmatchedCount || 0,
    strengths: gradingResult.summary?.strengths || [],
    weakAreas,
    overallTeacherNote: gradingResult.summary?.overallTeacherNote || 'Assessment evaluation complete.'
  };

  return {
    questions: processedQuestions,
    answers: processedAnswers,
    unanswered,
    summary
  };
}


// ─── Stage 1: Extract Questions ──────────────────────────────────────────

async function extractQuestions(qpImages) {
  const prompt = `You are an expert exam paper analyzer. Look at the attached question paper image(s) carefully.

Extract EVERY question in the exact order they appear. For questions with sub-parts (like 11a, 11b), create a separate entry for each sub-part.

CRITICAL: DETECT "OR" ALTERNATIVE CHOICE QUESTIONS
Look carefully for the word "OR" or "Or" appearing as a standalone label separating two sub-options under the same question number (e.g. between 18(a) and 18(b), 20(a) and 20(b), 21(a) and 21(b)).
When an "OR" structure is present between sub-parts under the same main question number:
1. Mark both sub-options with "isAlternativeGroup": true.
2. Set "alternativeGroupId" to the main question number string (e.g., "18", "20", "21").
3. Set "alternativeOption" to "a" or "b" (or the sub-part identifier).

Return ONLY a valid JSON array. Each element must have this exact schema:
[
  {
    "id": "q18_a",
    "qNo": "18",
    "subPart": "a.",
    "text": "Full exact question text as printed on the paper",
    "maxMarks": 5,
    "page": 1,
    "isAlternativeGroup": true,
    "alternativeGroupId": "18",
    "alternativeOption": "a"
  }
]

Rules:
- "id" must be unique: "q1", "q2", "q3"... For sub-parts: "q11_a", "q11_b", "q18_a", "q18_b".
- "qNo" is the printed question number as a string (e.g. "18").
- "subPart" is null if no sub-part, otherwise "a.", "b.", etc.
- "text" must be the COMPLETE question text exactly as printed. Do NOT truncate.
- "maxMarks" from the paper if visible. If not visible, estimate.
- "page" is which image (1-indexed) the question appears on.
- "isAlternativeGroup": true if this question is part of an OR choice pair under the same main question number, false otherwise.
- "alternativeGroupId": string matching the parent question number (e.g. "18") if part of an OR choice pair, otherwise null.
- "alternativeOption": "a", "b", etc. if part of an OR choice pair, otherwise null.

Return ONLY the JSON array. No explanation, no markdown fences.`;

  const imageParts = buildImageParts(qpImages);

  const response = await callGeminiVision([
    { role: 'user', parts: [{ text: prompt }, ...imageParts] }
  ], 'Stage1-ExtractQuestions');

  const questions = extractJSON(response.text);
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Stage 1 failed: no questions extracted from response');
  }

  return detectAndTagAlternativeGroups(questions);
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
  ], 'Stage2-ExtractAnswers');

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

IMPORTANT NOTE ON CHOICE / OR QUESTIONS:
Alternative choice questions (OR questions) have already been resolved to required questions only.
Evaluate ONLY the questions provided in the input payload.
Do NOT list unattempted alternative choices as missing answers, unanswered sub-questions, or weak areas in your summary or teacher note.

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
  ], 'Stage3-GradeAndMap');

  const result = extractJSON(response.text);
  if (!result || !result.gradedAnswers) {
    throw new Error('Stage 3 failed: no grading result in response');
  }

  return result;
}


// ─── API Route Handler ───────────────────────────────────────────────────

export async function POST(request) {
  const clients = getAIClients();
  if (clients.length === 0) {
    console.error('[API] No Gemini API keys configured');
    return NextResponse.json(
      { success: false, error: 'No Gemini API keys configured. Set GEMINI_API_KEY_1 and GEMINI_API_KEY_2 in .env.local' },
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
        const rawQuestions = await extractQuestions(qpImages);
        const questions = detectAndTagAlternativeGroups(rawQuestions);
        send({ type: 'progress', stage: 1, text: `Extracted ${questions.length} questions` });

        // Stage 2: Read handwritten answers and estimate bounding boxes
        send({ type: 'progress', stage: 2, text: `Reading handwritten answers from ${asImages.length} page(s)...` });
        const rawAnswers = await extractAnswers(asImages, questions);
        send({ type: 'progress', stage: 2, text: `Extracted ${rawAnswers.length} answers` });

        // Stage 3: Resolve alternative choice selections & grade
        send({ type: 'progress', stage: 3, text: 'Grading answers & generating AI feedback...' });
        const preExcludedQIds = resolveAlternativeGroupSelections(questions, rawAnswers);
        const activeQuestionsForGrading = questions.filter(q => !preExcludedQIds.has(q.id));
        const activeAnswersForGrading = rawAnswers.filter(a => !preExcludedQIds.has(a.questionId));

        const rawGradingResult = await gradeAndMap(activeQuestionsForGrading, activeAnswersForGrading);

        const {
          questions: finalQuestions,
          answers: finalAnswers,
          unanswered: finalUnanswered,
          summary: finalSummary
        } = finalizeGradingAndSummary(questions, rawAnswers, rawGradingResult, preExcludedQIds);

        // Merge grading verdicts with spatial bbox data from Stage 2
        // so the answer viewer can highlight the correct region on the sheet
        const mergedAnswers = finalAnswers.map((graded) => {
          const rawAns = rawAnswers.find(a => a.id === graded.id || a.questionId === graded.questionId);
          return {
            ...graded,
            page: rawAns?.page || 1,
            bbox: rawAns?.bbox || { ymin: 0, xmin: 0, ymax: 10, xmax: 100 },
            extractedText: rawAns?.extractedText || graded.extractedText || '',
          };
        });

        send({ type: 'progress', stage: 4, text: 'Assessment complete!' });

        send({
          type: 'result',
          data: {
            questions: finalQuestions,
            answers: mergedAnswers,
            unanswered: finalUnanswered,
            summary: finalSummary,
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

