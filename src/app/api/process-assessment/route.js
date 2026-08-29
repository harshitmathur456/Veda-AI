import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// ─── Server-side only — Use only GEMINI_API_KEY_4 for fast, dedicated calls ──
function getAIClients() {
  // Always use GEMINI_API_KEY_4 as the primary (dedicated fast key)
  const primaryKey = process.env.GEMINI_API_KEY_4;
  if (primaryKey && primaryKey.trim()) {
    return [{ label: 'key-4', client: new GoogleGenAI({ apiKey: primaryKey.trim() }) }];
  }

  // Emergency fallback: try numbered keys 1-3 if key-4 is somehow missing
  for (let i = 3; i >= 1; i--) {
    const val = process.env[`GEMINI_API_KEY_${i}`];
    if (val && val.trim()) {
      return [{ label: `key-${i}`, client: new GoogleGenAI({ apiKey: val.trim() }) }];
    }
  }

  // Last resort: legacy key
  const legacyKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  if (legacyKey && legacyKey.trim()) {
    return [{ label: 'key-legacy', client: new GoogleGenAI({ apiKey: legacyKey.trim() }) }];
  }

  return [];
}

const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];

// Timestamped tracker of keys that hit 429 quota limits (automatically resets after 60s)
const exhaustedKeyTimestamps = new Map();

function isKeyRecentlyExhausted(label) {
  if (!exhaustedKeyTimestamps.has(label)) return false;
  const timestamp = exhaustedKeyTimestamps.get(label);
  if (Date.now() - timestamp > 60000) {
    exhaustedKeyTimestamps.delete(label);
    return false;
  }
  return true;
}

function markKeyAsExhausted(label) {
  exhaustedKeyTimestamps.set(label, Date.now());
}

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
 *  - Filter out recently exhausted keys first.
 *  - For each API key, try each model in sequence.
 *  - If a call fails with a quota/rate-limit error, remember the key as exhausted and move to the next key.
 *  - If a call fails with a non-quota error (network, malformed, etc.),
 *    try the next model under the SAME key, then move to the next key.
 *  - Only surface the final error if ALL keys × models are exhausted.
 */
async function callGeminiVision(contents, stageName = 'unknown') {
  const aiClients = getAIClients();
  if (aiClients.length === 0) {
    throw new Error('No Gemini API keys configured. Set GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3 in .env.local');
  }

  // Estimate payload size for diagnostics
  const payloadEstimate = JSON.stringify(contents).length;
  console.log(`[API][${stageName}] Payload estimate: ${(payloadEstimate / 1024 / 1024).toFixed(2)} MB`);

  const modelsToTry = [MODEL_ID, ...FALLBACK_MODELS.filter(m => m !== MODEL_ID)];
  let lastError;

  // Prefer keys that haven't hit quota limits recently
  const availableClients = aiClients.filter(c => !isKeyRecentlyExhausted(c.label));
  const clientsToTry = availableClients.length > 0 ? availableClients : aiClients;

  for (const { label: keyLabel, client: aiClient } of clientsToTry) {
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
          console.warn(`[API][${stageName}] ${keyLabel} hit quota/rate limit — remembering as exhausted and switching to next key`);
          markKeyAsExhausted(keyLabel);
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

export const maxDuration = 300; // 5 minutes for long vision extractions

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

function normalizeBbox(rawBbox) {
  if (!rawBbox || typeof rawBbox !== 'object') {
    return null;
  }

  let ymin = Number(rawBbox.ymin ?? rawBbox.y1 ?? rawBbox.top ?? 0);
  let xmin = Number(rawBbox.xmin ?? rawBbox.x1 ?? rawBbox.left ?? 0);
  let ymax = Number(rawBbox.ymax ?? rawBbox.y2 ?? rawBbox.bottom ?? 0);
  let xmax = Number(rawBbox.xmax ?? rawBbox.x2 ?? rawBbox.right ?? 0);

  if (ymax === 0 && xmax === 0) {
    return null;
  }

  // Detect 0.0 - 1.0 normalized range
  if (ymax <= 1.0 && xmax <= 1.0 && (ymax > 0 || xmax > 0)) {
    ymin *= 100;
    xmin *= 100;
    ymax *= 100;
    xmax *= 100;
  } else if (ymax > 100 || xmax > 100) {
    ymin = (ymin / 1000) * 100;
    xmin = (xmin / 1000) * 100;
    ymax = (ymax / 1000) * 100;
    xmax = (xmax / 1000) * 100;
  }

  // Reject invalid, near-zero area, or top-bar dummy strips
  if (ymin >= ymax || xmin >= xmax || (ymax - ymin) < 1.5 || (xmax - xmin) < 3.0) {
    return null;
  }

  if (ymin <= 1 && ymax <= 12 && xmin <= 2 && xmax >= 90) {
    return null;
  }

  ymin = Math.max(0, Math.min(ymin, 98));
  xmin = Math.max(0, Math.min(xmin, 95));
  ymax = Math.max(ymin + 2, Math.min(ymax, 100));
  xmax = Math.max(xmin + 5, Math.min(xmax, 100));

  return { ymin, xmin, ymax, xmax };
}

/**
 * Post-process: sanitize bounding boxes without destructively crushing overlapping Y-ranges.
 */
function sanitizeAnswersBboxes(answers) {
  return answers.map(a => ({
    ...a,
    bbox: normalizeBbox(a.bbox)
  }));
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

function normalizeCanonicalQuestions(rawQuestions) {
  const seenIds = new Map();

  return rawQuestions.map((q, idx) => {
    const qNo = String(q.qNo || idx + 1).trim();
    let sub = (q.subPart || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let opt = (q.alternativeOption || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    let baseId = `q${qNo}`;
    if (sub) {
      baseId += `_${sub}`;
    } else if (opt && q.isAlternativeGroup) {
      baseId += `_${opt}`;
    }

    let finalId = baseId;
    if (seenIds.has(baseId)) {
      const count = seenIds.get(baseId) + 1;
      seenIds.set(baseId, count);
      finalId = `${baseId}_${count}`;
    } else {
      seenIds.set(baseId, 1);
    }

    return {
      ...q,
      id: finalId,
      qNo: String(q.qNo || idx + 1),
      maxMarks: Number(q.maxMarks) || 1
    };
  });
}

function normalizeId(idStr) {
  if (!idStr) return '';
  let s = String(idStr).trim().toLowerCase();
  s = s.replace(/^ans_/, '');
  
  const numMatch = s.match(/\d+/);
  if (!numMatch) return s;
  
  const num = numMatch[0];
  let rest = s.substring(s.indexOf(num) + num.length);
  rest = rest.replace(/[^a-z0-9]/g, '');
  
  return `q${num}${rest ? `_${rest}` : ''}`;
}

/**
 * Finalize grading results and compute deterministic summary math.
 * Resolves OR alternative questions based on actual semantic matching and graded scores.
 */
function finalizeGradingAndSummary(questions, rawAnswers, gradingResult) {
  const gradedAnswers = (gradingResult.gradedAnswers || []).map(g => ({
    ...g,
    questionId: normalizeId(g.questionId || g.id)
  }));

  // Group questions by alternativeGroupId
  const altGroups = {};
  questions.forEach(q => {
    if (q.isAlternativeGroup && q.alternativeGroupId) {
      const gid = q.alternativeGroupId;
      if (!altGroups[gid]) altGroups[gid] = [];
      altGroups[gid].push(q);
    }
  });

  const excludedQIds = new Set();

  // For each OR alternative group:
  Object.entries(altGroups).forEach(([gid, groupQuestions]) => {
    // Group subquestions by alternativeOption ('a', 'b', etc.)
    const byOption = {};
    groupQuestions.forEach(q => {
      const opt = (q.alternativeOption || 'a').toLowerCase();
      if (!byOption[opt]) byOption[opt] = [];
      byOption[opt].push(q);
    });

    const options = Object.keys(byOption);
    if (options.length <= 1) return;

    // Calculate score / attempt for each option
    const optionStats = options.map(opt => {
      const optQs = byOption[opt];
      const optQIds = new Set(optQs.map(q => q.id));
      const optGraded = gradedAnswers.filter(g => optQIds.has(g.questionId));
      
      const totalMarks = optGraded.reduce((sum, g) => sum + (Number(g.marks) || 0), 0);
      const hasAnyMarks = optGraded.some(g => Number(g.marks) > 0);
      const hasAttemptedRationale = optGraded.some(g => g.rationale && !g.rationale.toLowerCase().includes('not attempted'));
      
      return {
        option: opt,
        questions: optQs,
        graded: optGraded,
        totalMarks,
        isAttempted: (hasAnyMarks || hasAttemptedRationale) && optGraded.length > 0
      };
    });

    // Find attempted options
    const attemptedOptions = optionStats.filter(s => s.isAttempted);

    let chosenOption = options[0]; // default to first option if none attempted
    if (attemptedOptions.length === 1) {
      chosenOption = attemptedOptions[0].option;
    } else if (attemptedOptions.length > 1) {
      // If student attempted both options, pick the higher scoring one
      attemptedOptions.sort((a, b) => b.totalMarks - a.totalMarks);
      chosenOption = attemptedOptions[0].option;
    }

    // Exclude all other options in this OR group
    options.forEach(opt => {
      if (opt !== chosenOption) {
        byOption[opt].forEach(q => {
          excludedQIds.add(q.id);
        });
      }
    });
  });

  const processedQuestions = questions.map(q => ({
    ...q,
    isExcludedAlternative: excludedQIds.has(q.id)
  }));

  const processedAnswers = gradedAnswers.map(g => {
    const qId = g.questionId;
    const isExcluded = excludedQIds.has(qId);
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

  const answeredQIds = new Set(activeAnswers.map(a => a.questionId));
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

  const taggedQuestions = detectAndTagAlternativeGroups(questions);
  return normalizeCanonicalQuestions(taggedQuestions);
}


// ─── Stage 2: Extract Handwritten Answers ────────────────────────────────

async function extractAnswers(asImages, questions = []) {
  const questionsSummary = questions?.length > 0 ? questions.map(q =>
    `Q${q.qNo}${q.subPart || ''} (id: ${q.id}): "${q.text.substring(0, 100)}"`
  ).join('\n') : '';

  /**
   * The bbox instructions are critical for the answer viewer overlay.
   * Each answer's bounding box must end where the next answer begins,
   * so the highlight rectangles don't overlap on the answer sheet image.
   */
  const prompt = `You are an expert at reading handwritten student answer sheets. Analyze the attached handwritten answer sheet image(s).
${questionsSummary ? `Here are the questions from the question paper:\n${questionsSummary}\n` : ''}
For EACH handwritten answer visible on the answer sheet:
1. Read the handwritten text carefully, even if messy.
2. Identify the question number the student wrote (e.g. Q1 -> "q1", Q2 -> "q2", Q11(a) -> "q11_a", Q18(a) -> "q18_a", Q18(b) -> "q18_b").
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
- "id": "ans_" + question id (e.g. "ans_q1", "ans_q11_a", "ans_q18_ai", "ans_q18_b")
- "questionId": must match a question id from above. IMPORTANT: For Q18 and Q21, pay close attention to whether the handwritten text is Option A (e.g. seed dormancy / pea vs castor seed → q18_ai/q18_aii) OR Option B (e.g. follicle stage → q18_b). Match the exact questionId from the input list.
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

  // Post-process: sanitize bboxes without destructively crushing Y-ranges
  return sanitizeAnswersBboxes(answers);
}


// ─── Stage 3: Grade & Map ────────────────────────────────────────────────

async function gradeAndMap(questions, answers) {
  const payload = {
    questions: questions.map(q => ({
      id: q.id,
      qNo: q.qNo,
      subPart: q.subPart,
      text: q.text,
      maxMarks: q.maxMarks,
      isAlternativeGroup: q.isAlternativeGroup,
      alternativeGroupId: q.alternativeGroupId,
      alternativeOption: q.alternativeOption
    })),
    answers: answers.map(a => ({
      id: a.id,
      questionId: a.questionId,
      extractedText: a.extractedText
    })),
  };

  /**
   * The grading prompt uses a structured evaluation rubric with semantic matching
   * across candidate questions and explicit deduction rules for incorrect answers.
   */
  const prompt = `You are a strict academic exam evaluator and subject matter expert. Grade each student answer against its corresponding question.

CRITICAL SEMANTIC MATCHING MANDATE:
1. Student answers may have an approximate question ID or no question ID. You MUST match each student answer to the exact question whose content and subject matter it semantically addresses!
2. FOR OR / ALTERNATIVE QUESTIONS (e.g. Q18(a) vs Q18(b), Q20(a) vs Q20(b), Q21(a) vs Q21(b)):
   - Check what the student actually wrote against BOTH options.
   - Do NOT assume option (a) by default! Match based strictly on the semantic content of the answer.
   - Example 1: If the student wrote about "seed dormancy" or "pea seed / castor seed", match it to the seed question (18(a)), NOT 18(b).
   - Example 2: If the student wrote about "follicle / primary oocyte / meiotic division", match it to 18(b).
   - Example 3: If the student wrote about "Humoral Immune Response" or "antibodies IgG, IgM", match it to the immune response question (17(a) / 17(b)).
   - Example 4: If the student wrote about "XO / ZW sex determination", match it to 20(a).
   - Example 5: If the student wrote about "inverted pyramid of biomass", match it to 21(a).

CRITICAL ID MANDATE:
"id" in each gradedAnswer MUST be the EXACT "id" string from the input answer object (e.g. ans_1, ans_15, ans_23). DO NOT invent or alter the input "id" string.

CRITICAL EVALUATION MANDATE:
Evaluate the answer for factual correctness, accuracy, and completeness relative to the question asked.
Do NOT give full marks simply because an answer was written — award marks based on how much of the expected correct content is present, accurate, and relevant.
- For Multiple Choice / Matching Questions:
  * For Column Matching (e.g. Q9): Check the student's matched pairs against the actual correct options. If the student's matching is incorrect (e.g. matching wrong columns), award ZERO marks (0/1) with verdict "incorrect".
- For Short-Answer / Definition Questions:
  * A wrong, incorrect, or irrelevant answer MUST receive ZERO marks (0), even if text is written.
  * A vague or incomplete answer MUST receive partial marks.
  * Only a complete, factually accurate answer receives full marks.

GRADED DATA INPUT:
${JSON.stringify(payload, null, 2)}

Return ONLY a valid JSON object matching this schema:
{
  "gradedAnswers": [
    {
      "id": "ans_q1",
      "questionId": "q1",
      "marks": 1,
      "maxMarks": 1,
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
        // Stage 1: Extract questions from question paper
        send({ type: 'progress', stage: 1, text: 'Extracting questions from question paper...' });
        const questions = await extractQuestions(qpImages);
        send({ type: 'progress', stage: 1, text: `Extracted ${questions.length} questions` });

        // Stage 2: Extract handwritten answers WITH question context for accurate mapping
        send({ type: 'progress', stage: 2, text: `Reading handwritten answers from ${asImages.length} page(s)...` });
        const rawAnswers = await extractAnswers(asImages, questions);
        send({ type: 'progress', stage: 2, text: `Extracted ${rawAnswers.length} student answers` });

        // Stage 3: Grade all questions with semantic mapping for OR pairs
        send({ type: 'progress', stage: 3, text: 'Grading answers & generating AI feedback...' });
        const rawGradingResult = await gradeAndMap(questions, rawAnswers);

        const {
          questions: finalQuestions,
          answers: finalAnswers,
          unanswered: finalUnanswered,
          summary: finalSummary
        } = finalizeGradingAndSummary(questions, rawAnswers, rawGradingResult);

        // Track raw answer IDs that have already been matched to avoid duplicate bbox assignment
        const usedRawIds = new Set();

        const mergedAnswers = finalAnswers.map((graded) => {
          // 1. Direct ID match
          let rawAns = rawAnswers.find(a => !usedRawIds.has(a.id) && a.id === graded.id);

          // 2. Normalized Question ID match
          if (!rawAns) {
            rawAns = rawAnswers.find(a => !usedRawIds.has(a.id) && normalizeId(a.questionId) === normalizeId(graded.questionId));
          }

          // 3. Fallback match: same main question number (qNo)
          if (!rawAns) {
            const qNoMatch = (graded.questionId || '').match(/\d+/);
            if (qNoMatch) {
              const qNo = qNoMatch[0];
              rawAns = rawAnswers.find(a => {
                if (usedRawIds.has(a.id)) return false;
                const rawNum = (a.questionId || '').match(/\d+/)?.[0];
                return rawNum === qNo;
              });
            }
          }

          if (rawAns?.id) {
            usedRawIds.add(rawAns.id);
          }

          const normBbox = rawAns?.bbox ? normalizeBbox(rawAns.bbox) : null;
          return {
            ...graded,
            page: normBbox ? (rawAns?.page || 1) : null,
            bbox: normBbox,
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

