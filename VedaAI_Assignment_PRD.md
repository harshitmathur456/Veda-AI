# Product Requirements Document
## AI Assessment Extraction & Answer Mapping
**Prepared for:** VedaAI Full-Stack Developer Intern Assignment
**Author:** Harshit Mathur
**Date:** August 2026

---

## 1. Overview

A web application that lets a teacher upload a question paper and a student's handwritten answer sheet, automatically extracts questions and answers using AI, maps each answer to its corresponding question, and visually highlights the exact answer region on the sheet — with optional grading and AI-generated feedback.

**Problem statement:** Manually cross-referencing a question paper against a handwritten answer sheet is slow and error-prone for teachers, especially at scale. This tool automates extraction and mapping so a teacher can instantly see what was answered, where, and what wasn't.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Accurate question extraction | 100% of questions extracted in correct printed order, including sub-parts |
| Accurate answer mapping | Correct question↔answer pairing even when answered out of order |
| Precise highlighting | Bounding box aligns tightly with the actual handwritten answer region |
| Robust edge-case handling | Unanswered / unmatched / multi-page answers handled gracefully, not silently dropped |
| Strong product experience | Teacher can understand a student's performance in under 60 seconds of review |

---

## 3. User Persona

**Primary user:** School teacher grading handwritten assessments.
- Not technical — needs a clean, self-explanatory UI (per Figma reference)
- Cares about speed and trust — must be able to verify AI output quickly, not blindly trust it
- Will use this repeatedly across many students, so consistency and low friction matter

---

## 4. Core User Flow

```
Upload question paper (PDF/image)
        ↓
Upload student answer sheet (PDF/image)
        ↓
Processing (progress shown: extracting questions → extracting answers → mapping → grading)
        ↓
Side-by-side view: Questions (left) | Answer Sheet (right, rendered as image/PDF)
        ↓
Teacher clicks a question → corresponding answer region highlights on the sheet
        ↓
(Optional) Grading summary: marks, correct/incorrect, AI feedback per question + overall
```

---

## 5. Functional Requirements

### 5.1 Upload & Processing
- FR1: Accept question paper as PDF or image(s)
- FR2: Accept one student answer sheet as PDF or image(s)
- FR3: Show real-time processing progress with distinct stages (upload → OCR/extraction → mapping → grading)
- FR4: Support multi-page PDFs for both inputs

### 5.2 Question Extraction
- FR5: Extract every question in correct printed order
- FR6: Treat labelled sub-parts (e.g., 1a, 1b) as separate question entries
- FR7: Preserve original question numbering exactly as printed
- FR8: Store extracted question text + page number + bounding box (for reference/debug view)

### 5.3 Answer Extraction
- FR9: Extract handwritten answer regions from the answer sheet
- FR10: Support answers spanning multiple pages
- FR11: Store bounding box coordinates per answer region per page

### 5.4 Answer Mapping
- FR12: Map each extracted answer to its most likely corresponding question using semantic matching (not just positional/number matching)
- FR13: Handle answers written out of order (e.g., student answers Q5 before Q3)
- FR14: Flag questions with no matching answer as "Unanswered"
- FR15: Flag answers with no confident matching question as "Unmatched" (shown separately, not discarded)

### 5.5 Highlighting
- FR16: On question click, scroll to and highlight the exact bounding-box region on the answer sheet viewer
- FR17: Highlight must render correctly across page breaks for multi-page answers
- FR18: (Extra) On answer-region click, reverse-highlight the corresponding question

### 5.6 Grading & AI Insights (in-scope per assignment)
- FR19: Generate per-question marks/score
- FR20: Generate correct/incorrect (or partial) evaluation
- FR21: Generate per-question AI feedback
- FR22: Generate an overall grading summary (total score, strengths, weak areas)

### 5.7 Extra Value-Add Features (differentiators)
- FR23: Confidence score displayed per extraction/mapping result
- FR24: Manual override — teacher can re-map an answer to a different question via click/drag
- FR25: Retry/re-extract button for a single question if OCR result looks wrong
- FR26: Export grading report (PDF/CSV)
- FR27: Synchronized scroll between question list and answer sheet viewer

---

## 6. Non-Functional Requirements

- No authentication required
- No database required — in-memory state only (React context/state, cleared on refresh)
- Must be deployed and publicly accessible via a live URL
- Reasonable processing time (target: under ~30s for a 2-3 page paper) with visible progress feedback so it doesn't feel stuck
- Graceful failure — never a blank screen; always show partial results + error messaging

---

## 7. Technical Architecture

**Stack**
- Frontend/Framework: Next.js (App Router) + Tailwind CSS
- File handling: PDF → image conversion (pdf.js / pdf-lib) before sending to vision model
- AI/Extraction: Gemini 2.5 Flash (free tier, multimodal vision + structured JSON output)
- Answer sheet viewer: react-pdf or canvas-based image viewer with overlay layer for bounding boxes
- State: In-memory only (React state/context) — no persistence layer
- Deployment: Vercel

**High-level pipeline**
1. Convert uploaded PDFs to per-page images
2. Send question paper images → Gemini → structured JSON: `[{q_no, sub_part, question_text, page, bbox}]`
3. Send answer sheet images → Gemini → structured JSON: `[{extracted_text, page, bbox}]`
4. Run mapping pass: Gemini compares question list + answer list → semantic best-match pairing with confidence score
5. (Optional) Run grading pass: Gemini scores each mapped Q&A pair + generates feedback
6. Render results in side-by-side UI with interactive highlighting

---

## 8. Data Model (In-Memory)

```ts
type Question = {
  id: string;
  qNo: string;       // e.g., "3" or "3a"
  text: string;
  page: number;
  bbox: [x, y, w, h];
};

type ExtractedAnswer = {
  id: string;
  text: string;
  pages: number[];
  bboxes: { page: number; bbox: [x, y, w, h] }[];
};

type Mapping = {
  questionId: string | null;   // null if unmatched answer
  answerId: string | null;     // null if unanswered question
  confidence: number;          // 0-1
  status: "matched" | "unanswered" | "unmatched";
};

type Grading = {
  questionId: string;
  marks: number;
  maxMarks: number;
  verdict: "correct" | "incorrect" | "partial";
  feedback: string;
};
```

---

## 9. Edge Cases & Handling

| Case | Handling |
|---|---|
| Sub-parts (1a, 1b) | Explicit prompt instruction to split into separate entries |
| Out-of-order answers | Semantic mapping pass, not positional index matching |
| Unanswered question | Explicitly marked "No answer found," shown in summary |
| Orphan/unmatched answer | Shown in separate "Unmatched" section, not silently dropped |
| Multi-page answer | Bbox array per page, highlight logic must jump pages on click |
| Poor handwriting / low OCR confidence | Confidence score shown; flagged for manual review |
| Incorrect AI mapping | Manual override UI lets teacher correct it |

---

## 10. Out of Scope

- Multi-student batch processing (mentioned as a possible future extension, not required)
- User authentication / accounts
- Persistent storage / database
- Support for non-English question papers (unless time permits)

---

## 11. Milestones

| Day | Deliverable |
|---|---|
| 1 | Upload UI + Figma-matched layout, file handling, PDF→image pipeline |
| 2 | Question extraction pipeline + JSON schema validation |
| 3 | Answer extraction + bbox highlighting on viewer |
| 4 | Mapping logic + edge cases + grading/feedback layer |
| 5 | Extra features (confidence scores, manual override), polish, deploy, write submission doc |

---

## 12. Evaluation Alignment

| Evaluation Criterion | How This PRD Addresses It |
|---|---|
| Accuracy of question extraction | FR5-FR8, structured JSON with strict prompt instructions |
| Accuracy of answer mapping | FR12-FR15, semantic matching + confidence scoring |
| Correct highlighting | FR16-FR18, bbox-driven overlay with multi-page support |
| Handling of edge cases | Section 9, explicit table of cases and handling |
| Quality of implementation | Clean data model, staged pipeline, error handling |
| Overall product experience | Progress states, confidence scores, manual override, export |

---

## 13. Assumptions & Limitations

- Handwriting legibility varies; extraction accuracy depends on scan/photo quality
- Gemini free tier rate limits may require basic retry/backoff logic
- Single-student flow only, per assignment scope
- Grading logic is AI-assisted, not a replacement for teacher judgment — framed as a first-pass assist, matching VedaAI's actual product positioning
