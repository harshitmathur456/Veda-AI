# UI/UX Brief
## AI Assessment Extraction & Answer Mapping — VedaAI Assignment
Derived from the provided Figma design reference.

---

## 1. Screen Inventory

The design covers 4 core states, each with a **desktop (side-by-side)** and **mobile (tab-switcher)** layout:

| # | State | Desktop Layout | Mobile Layout |
|---|---|---|---|
| 1 | Upload — empty state | Two dashed upload cards side by side | Two stacked upload cards |
| 2 | Upload — files selected | Cards show file name, size, page count + remove (×) | Same, stacked |
| 3 | Extracting / processing | Centered loading state, sidebar auto-collapses to icon rail | Same centered loading state |
| 4 | Results — questions + answer sheet | Split view: question list (left) / answer sheet viewer (right) | Tab switcher: "Questions" / "Answer Sheet" |

---

## 2. Screen-by-Screen Breakdown

### 2.1 Upload — Empty State
- Header: back arrow, breadcrumb ("Exams"), help icon, notification bell (with red dot), AI/sparkle icon, user avatar + name + dropdown chevron
- Left sidebar (desktop only): logo, "AI Teacher's Toolkit" pill button (dark bg, orange border), nav items (Home, My Classroom, Assignments, Exams — active/highlighted, My Library), Settings, school card footer (logo + school name + location)
- Page title: "Upload **Question Paper & Answer Sheets**" — second part in an orange highlighted pill/background, bold
- Subtitle: "Upload both files to get started" (gray, centered)
- Decorative circular illustration (teacher avatar) with small orange accent dots around the circle border
- Two dashed-border upload cards side by side:
  - Upload icon (box with up-arrow)
  - Bold label: "Upload **Question Paper**" / "Upload **Answer Sheet**" (second word in orange)
  - Helper text: "Max 10MB" (gray, small)
- CTA button below cards: "Start Mapping →" — **disabled/grayed out** until both files present
- Micro-copy below CTA: "Once both files are uploaded, you'll able to map answers with questions"

### 2.2 Upload — Files Selected State
- Identical layout to 2.1, but each card becomes a **solid white file-preview row**:
  - Red PDF icon (left)
  - Bold filename (e.g., "Class_10_maths_unit_test.pdf")
  - Gray metadata line: size + page count (e.g., "2MB · 2 Pages")
  - Circular "×" remove button (top-right of card)
- "Start Mapping →" button becomes **active** (solid dark background) once both files are present

### 2.3 Extracting / Processing State
- Sidebar auto-collapses to a narrow icon-only rail (space-efficient during processing)
- Main content area is a large centered white card
- Center content: animated sparkle/star icon (orange), "**Extracting...**" (bold), "This may take a while" (gray subtext)
- This is a single shared loading state — same pattern should be reused for "Mapping..." and "Grading..." sub-stages (extend with a subtitle change, e.g., "Mapping answers to questions...")

### 2.4 Results View — Core Screen (most important)

**Left panel — "Extracted Questions (from question paper)"**
- Panel header with "Expand All" toggle button (top-right)
- Each question is a **card row** containing:
  - Circular number badge (1, 2, 3… and "11 a" / "11 b" for labelled sub-parts — number stays same, letter shown as separate small badge)
  - Question text (wraps to 2-3 lines)
  - **Score badge** (pill, right-aligned): color-coded —
    - Green (e.g., "5/5", "2/2", "4/5") = correct/high score
    - Orange/amber (e.g., "3/5", "1/3") = partial
    - Red (e.g., "0/2") = incorrect
  - Chevron (expand/collapse arrow)
- **Selected/expanded question** gets a distinct **orange border + light orange-tinted background** around the whole card
- Expanded card reveals an **"AI Feedback"** sub-section inline:
  - Small bold label "AI Feedback"
  - Feedback sentence in gray text, teacher-tone (e.g., "Excellent work! You correctly identified the chloroplast as the organelle responsible for photosynthesis. Keep it up!")
- List is scrollable independently of the right panel

**Right panel — "Answer Sheet"**
- Header bar: "Answer Sheet" label, zoom controls ("− 100% +"), page navigator ("‹ Page 1 of 4 ›")
- Main area: rendered scanned answer sheet image (ruled notebook paper look, handwritten text in blue pen)
- **Answer highlighting:**
  - The answer region matching the currently selected question gets a **colored rounded-rectangle border** (green in the example) drawn directly over the handwritten region
  - A small **tag label** ("Q2") sits at the top-left corner of the highlighted box, same color as the border
  - Highlighting must scroll the viewer to bring the region into view when a question is clicked
- Sheet is scrollable/paginated independently — supports multi-page answers

### 2.5 Mobile Adaptations
- Same header pattern, hamburger menu instead of full sidebar
- Below header: a **segmented tab control** — "Questions" | "Answer Sheet" (pill-style, active tab has dark background)
- "Questions" tab = full-width version of the left panel (same card design, badges, expand/AI feedback)
- "Answer Sheet" tab = full-width version of the right panel (same zoom/page controls, same highlight-with-tag pattern)
- Tapping a question could auto-switch to the "Answer Sheet" tab with the highlight applied — recommended UX addition for mobile parity with desktop's simultaneous view

---

## 3. Design System Notes

**Color palette**
- Primary accent: Orange/coral (`~#F0653C` range) — used for highlights, active states, CTA emphasis, brand mark
- Neutrals: white cards on a soft gray gradient background; dark near-black for sidebar/nav and primary buttons
- Status colors: Green (correct), Amber/Orange (partial), Red (incorrect) — consistent traffic-light logic for scores

**Typography**
- Bold, large sans-serif for headings; regular weight for body/helper text
- Clear size hierarchy: page title > question text > metadata/helper text

**Components to build**
- Collapsible sidebar (full ↔ icon-rail)
- Segmented tab control (mobile)
- Dashed-border file drop card (empty + filled states)
- Score pill/badge (3 color variants)
- Expandable question card with inline feedback panel
- Zoomable, paginated document viewer with overlay-highlight support
- Loading/processing state card (reusable across extraction/mapping/grading stages)

**Interaction principles to preserve**
- Selection state is always visually doubled: the question card is bordered/tinted **and** the answer region is highlighted — reinforces the mapping visually
- Disabled → enabled CTA transition gives clear progress feedback
- Sidebar collapsing during processing keeps focus on the loading state — good affordance, worth replicating
- Everything is color-coded consistently (orange = active/brand, green/amber/red = evaluation)

---

## 4. Build Priority Mapping (ties to PRD)

| Figma Screen | Corresponds to PRD requirement |
|---|---|
| 2.1 / 2.2 Upload states | FR1-FR4 (Upload & Processing) |
| 2.3 Extracting state | FR3 (progress stages) |
| 2.4 Left panel | FR5-FR8 (Question Extraction), FR19-FR22 (Grading) |
| 2.4 Right panel | FR9-FR11, FR16-FR18 (Answer Extraction & Highlighting) |
| Orange-bordered selection sync | FR12-FR15 (Answer Mapping) — visual confirmation of correct mapping |
