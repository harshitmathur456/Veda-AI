/**
 * Realistic Mock Dataset for VedaAI Sample Assessment
 * Sample Paper: Class 10 Science & Mathematics Assessment
 */

export const SAMPLE_QUESTION_PAPER_NAME = "Class_10_Science_Unit_Test.pdf";
export const SAMPLE_ANSWER_SHEET_NAME = "Student_Aarav_Answer_Sheet.pdf";

export const MOCK_QUESTIONS = [
  {
    id: "q1",
    qNo: "1",
    subPart: null,
    text: "Define photosynthesis and write the balanced chemical equation representing the process.",
    maxMarks: 5,
    page: 1,
    bbox: [5, 10, 15, 90], // [ymin, xmin, ymax, xmax] in %
  },
  {
    id: "q2",
    qNo: "2",
    subPart: null,
    text: "Identify the organelle responsible for photosynthesis in plant cells and state its primary pigment.",
    maxMarks: 5,
    page: 1,
    bbox: [18, 10, 28, 90],
  },
  {
    id: "q3",
    qNo: "3",
    subPart: null,
    text: "State Ohm's Law and derive the formula relating Voltage (V), Current (I), and Resistance (R).",
    maxMarks: 5,
    page: 1,
    bbox: [32, 10, 42, 90],
  },
  {
    id: "q4",
    qNo: "4",
    subPart: null,
    text: "Calculate the total resistance of two resistors (R1 = 4Ω, R2 = 6Ω) connected in series and in parallel.",
    maxMarks: 5,
    page: 2,
    bbox: [5, 10, 16, 90],
  },
  {
    id: "q5_a",
    qNo: "5",
    subPart: "a",
    text: "Describe the function of the human digestive system during carbohydrate breakdown.",
    maxMarks: 3,
    page: 2,
    bbox: [20, 10, 30, 90],
  },
  {
    id: "q5_b",
    qNo: "5",
    subPart: "b",
    text: "List two enzymes involved in protein digestion and state their locations.",
    maxMarks: 2,
    page: 2,
    bbox: [33, 10, 42, 90],
  },
  {
    id: "q6",
    qNo: "6",
    subPart: null,
    text: "Explain the difference between reflection and refraction with suitable ray diagrams.",
    maxMarks: 5,
    page: 2,
    bbox: [46, 10, 56, 90],
  }
];

export const MOCK_ANSWERS = [
  {
    id: "ans_q2",
    questionId: "q2",
    status: "matched",
    confidence: 0.96,
    page: 1,
    // [ymin, xmin, ymax, xmax] percentage on answer sheet page 1
    bbox: { ymin: 8, xmin: 8, ymax: 26, xmax: 92 },
    extractedText: "Ans 2: The organelle responsible for photosynthesis is Chloroplast. The primary pigment present inside chloroplasts is Chlorophyll, which absorbs light energy.",
    marks: 5,
    maxMarks: 5,
    verdict: "correct",
    feedback: "Excellent work! You correctly identified the chloroplast as the organelle responsible for photosynthesis and named chlorophyll accurately."
  },
  {
    id: "ans_q1",
    questionId: "q1",
    status: "matched",
    confidence: 0.94,
    page: 1,
    bbox: { ymin: 30, xmin: 8, ymax: 56, xmax: 92 },
    extractedText: "Ans 1: Photosynthesis is the biological process by which green plants synthesize glucose using CO2, H2O, and sunlight energy. Balanced equation: 6CO2 + 6H2O + Light -> C6H12O6 + 6O2.",
    marks: 5,
    maxMarks: 5,
    verdict: "correct",
    feedback: "Perfect answer! Both the definition and the balanced chemical equation are complete and accurate."
  },
  {
    id: "ans_q3",
    questionId: "q3",
    status: "matched",
    confidence: 0.88,
    page: 1,
    bbox: { ymin: 60, xmin: 8, ymax: 88, xmax: 92 },
    extractedText: "Ans 3: Ohm's Law states that current flowing through a conductor is directly proportional to potential difference across it at constant temperature. V = I * R.",
    marks: 4,
    maxMarks: 5,
    verdict: "partial",
    feedback: "Good definition of Ohm's Law. You mentioned V=I*R, but missed explicitly deriving the units (Volts = Amperes * Ohms)."
  },
  {
    id: "ans_q4",
    questionId: "q4",
    status: "matched",
    confidence: 0.92,
    page: 2,
    bbox: { ymin: 8, xmin: 8, ymax: 38, xmax: 92 },
    extractedText: "Ans 4: Series resistance: R_total = R1 + R2 = 4 + 6 = 10 Ohms. Parallel resistance: 1/R_total = 1/4 + 1/6 = (3+2)/12 = 5/12 -> R_total = 12/5 = 2.4 Ohms.",
    marks: 5,
    maxMarks: 5,
    verdict: "correct",
    feedback: "Flawless mathematical calculation for both series and parallel resistor configurations."
  },
  {
    id: "ans_q5_a",
    questionId: "q5_a",
    status: "matched",
    confidence: 0.82,
    page: 2,
    bbox: { ymin: 42, xmin: 8, ymax: 68, xmax: 92 },
    extractedText: "Ans 5(a): Carbohydrate digestion begins in the mouth where salivary amylase breaks down starch into maltose. Digestion continues in the small intestine.",
    marks: 3,
    maxMarks: 3,
    verdict: "correct",
    feedback: "Well articulated answer explaining carbohydrate breakdown in saliva and intestine."
  },
  {
    id: "ans_unmatched",
    questionId: null,
    status: "unmatched",
    confidence: 0.45,
    page: 2,
    bbox: { ymin: 72, xmin: 8, ymax: 92, xmax: 92 },
    extractedText: "[Rough Calculation / Notes]: V = 12V, I = 2A -> R = 6 Ohms. Extra rough work at bottom of paper.",
    marks: 0,
    maxMarks: 0,
    verdict: "none",
    feedback: "Unmatched region detected: Appears to be student rough work or scratch calculations not corresponding to a question."
  }
];

// Unanswered questions list derived
export const UNANSWERED_QUESTIONS = [
  {
    questionId: "q5_b",
    status: "unanswered",
    reason: "No corresponding answer handwritten on any page of the answer sheet.",
    marks: 0,
    maxMarks: 2,
    verdict: "incorrect",
    feedback: "Unanswered: Question 5(b) was not attempted on the answer sheet."
  },
  {
    questionId: "q6",
    status: "unanswered",
    reason: "No corresponding answer handwritten on any page of the answer sheet.",
    marks: 0,
    maxMarks: 5,
    verdict: "incorrect",
    feedback: "Unanswered: Question 6 was not attempted on the answer sheet."
  }
];

export const MOCK_SUMMARY = {
  totalMarksObtained: 22,
  totalMaxMarks: 30,
  percentage: 73.3,
  attemptedCount: 5,
  totalQuestions: 7,
  unansweredCount: 2,
  unmatchedCount: 1,
  strengths: ["Physics Calculations (Ohm's Law & Circuits)", "Plant Biology & Photosynthesis"],
  weakAreas: ["Human Digestive System Sub-parts", "Optics & Ray Diagrams"],
  overallTeacherNote: "Aarav showed excellent mathematical precision in Physics and Biology fundamentals. However, sub-part 5(b) and Question 6 were completely skipped. Suggest reviewing optics and enzyme locations."
};
