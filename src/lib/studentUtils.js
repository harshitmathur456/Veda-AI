import { supabase } from './supabase.js';

/**
 * Extract student name from handwritten answer sheet filename.
 * Strips known scan/upload patterns and keywords to isolate the likely student name.
 * @param {string} filename 
 * @returns {{ studentName: string | null, studentNameSource: 'auto_detected' | 'unspecified' }}
 */
export function detectStudentNameFromFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return { studentName: '', studentNameSource: 'unspecified' };
  }

  // Remove extension
  let nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Replace underscores, hyphens, periods with spaces
  let sanitized = nameWithoutExt.replace(/[_\-.]+/g, ' ').trim();

  // Remove known scan/camera patterns like scan001, IMG2384, image_01
  sanitized = sanitized.replace(/\b(scan|img|image|doc|photo|file)\d+\b/gi, '');

  const tokens = sanitized.split(/\s+/).filter(Boolean);

  const keywordsToStrip = new Set([
    'student', 'answer', 'answers', 'ans', 'sheet', 'sheets',
    'paper', 'pdf', 'doc', 'docx', 'copy', 'scan', 'scanned',
    'img', 'image', 'file', 'upload', 'assignment', 'test', 'exam',
    'final', 'draft', 'v1', 'v2', 'new', 'page', 'pages',
    'sample', 'question', 'bio', 'biology', 'math', 'maths',
    'science', 'physics', 'chem', 'chemistry', 'history', 'english',
    'hindi', 'class', 'grade', 'unit', 'sec', 'section', 'term'
  ]);

  // Filter out known keywords and numeric-only tokens
  const remainingTokens = tokens.filter(token => {
    const lower = token.toLowerCase();
    if (keywordsToStrip.has(lower)) return false;
    if (/^\d+$/.test(token)) return false;
    return true;
  });

  // Extract clean letter tokens with minimum 2 characters
  const validNameTokens = remainingTokens
    .map(t => t.replace(/[^a-zA-Z]/g, ''))
    .filter(t => t.length >= 2);

  // Require AT LEAST TWO WORDS (a plausible first + last name pattern)
  // Single generic words like "Bio", "Test", "Copy", "Scan" must be rejected.
  if (validNameTokens.length < 2) {
    return { studentName: '', studentNameSource: 'unspecified' };
  }

  // Title-case the valid name tokens
  const titleCased = validNameTokens.map(t => {
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }).join(' ');

  return {
    studentName: titleCased,
    studentNameSource: 'auto_detected'
  };
}

/**
 * Save grading assessment result to Supabase assessment_results table.
 * This is a non-blocking persistence layer — failures here must never
 * break the grading UI or discard results already shown to the user.
 * @param {Object} params
 * @param {string} params.questionPaperName
 * @param {string} params.handwrittenAnsPdfName
 * @param {string|null} params.studentName
 * @param {'auto_detected' | 'manual' | 'unspecified'} params.studentNameSource
 * @param {number} params.marksScored
 * @param {number} params.maxMarks
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function saveAssessmentResultToSupabase({
  questionPaperName,
  handwrittenAnsPdfName,
  studentName,
  studentNameSource = 'unspecified',
  marksScored,
  maxMarks,
}) {
  try {
    const cleanName = studentName && typeof studentName === 'string' && studentName.trim() ? studentName.trim() : null;
    const finalSource = cleanName ? (studentNameSource || 'unspecified') : 'unspecified';

    const record = {
      question_paper_name: questionPaperName || 'Question_Paper.pdf',
      handwritten_ans_pdf_name: handwrittenAnsPdfName || 'Answer_Sheet.pdf',
      student_name: cleanName,
      student_name_source: finalSource,
      marks_scored: Number(marksScored) || 0,
      max_marks: Number(maxMarks) || 0,
    };

    const { data, error } = await supabase
      .from('assessment_results')
      .insert([record])
      .select();

    if (error) {
      console.error('[Supabase] Insert error:', error);
      return { success: false, error: error.message || 'Failed to save record to Supabase' };
    }

    return { success: true, data: data?.[0] || record };
  } catch (err) {
    console.error('[Supabase] Exception during save:', err);
    return { success: false, error: err.message || 'Unexpected error saving to Supabase' };
  }
}
