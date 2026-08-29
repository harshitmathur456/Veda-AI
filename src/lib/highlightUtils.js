/**
 * Clean and normalize text to make anchor matching robust against punctuation and case differences.
 */
export function cleanTextForMatch(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "") // remove punctuation
    .replace(/\s+/g, " ") // normalize spacing
    .trim();
}

/**
 * Computes token overlap ratio between two strings.
 */
function getOverlapRatio(s1, s2) {
  const t1 = s1.split(" ").filter(Boolean);
  const t2 = s2.split(" ").filter(Boolean);
  if (t1.length === 0 || t2.length === 0) return 0;
  
  const set2 = new Set(t2);
  let intersection = 0;
  t1.forEach(t => {
    if (set2.has(t)) intersection++;
  });
  
  return intersection / Math.min(t1.length, t2.length);
}

/**
 * Robustly checks if a line matches an anchor string, avoiding short-string false matches.
 */
export function isLineMatch(lineText, anchorText) {
  const cleanLine = cleanTextForMatch(lineText);
  const cleanAnchor = cleanTextForMatch(anchorText);
  
  if (!cleanLine || !cleanAnchor) return false;
  
  // 1. Direct inclusion of clean anchor in clean line or clean line in clean anchor
  if (cleanLine.includes(cleanAnchor) || cleanAnchor.includes(cleanLine)) return true;
  
  // 2. Tokenize and filter out single/two-character noise tokens
  const lineWords = cleanLine.split(" ").filter(w => w.length > 2);
  const anchorWords = cleanAnchor.split(" ").filter(w => w.length > 2);
  
  if (lineWords.length === 0 || anchorWords.length === 0) {
    return cleanLine === cleanAnchor;
  }
  
  // Count how many significant anchor words are present in the line
  let matchCount = 0;
  anchorWords.forEach(w => {
    if (cleanLine.includes(w) || lineWords.some(lw => lw.includes(w) || w.includes(lw))) {
      matchCount++;
    }
  });
  
  // Accept if at least 40% of significant anchor words match
  const requiredMatches = Math.max(1, Math.ceil(anchorWords.length * 0.4));
  return matchCount >= requiredMatches;
}

/**
 * Computes a bounding box { ymin, xmin, ymax, xmax } based on text anchors and page lines.
 * 
 * @param {Array<{text: string, y: number}>} pageLines - Sorted line list with y coordinates
 * @param {string} startAnchor - First few words of the answer
 * @param {string} endAnchor - Last few words of the answer
 * @param {string} nextStartAnchor - First few words of the next answer on the same page
 * @returns {{ymin: number, xmin: number, ymax: number, xmax: number}} Bounding box
 */
export function computeHighlightRegion(pageLines, startAnchor, endAnchor, nextStartAnchor) {
  const sortedLines = [...(pageLines || [])].sort((a, b) => a.y - b.y);
  
  if (sortedLines.length === 0) {
    return { ymin: 10, xmin: 2, ymax: 90, xmax: 98 };
  }

  // 1. Find ymin (top edge)
  let ymin = 0;
  let startIdx = -1;
  
  if (startAnchor) {
    for (let i = 0; i < sortedLines.length; i++) {
      if (isLineMatch(sortedLines[i].text, startAnchor)) {
        ymin = sortedLines[i].y;
        startIdx = i;
        break;
      }
    }
  }

  if (startIdx === -1) {
    ymin = sortedLines[0].y;
    startIdx = 0;
  }

  // 2. Find ymax (bottom edge)
  let ymax = 100;
  let endIdx = -1;

  if (endAnchor) {
    for (let i = startIdx; i < sortedLines.length; i++) {
      if (isLineMatch(sortedLines[i].text, endAnchor)) {
        ymax = sortedLines[i].y + 5;
        endIdx = i;
        break;
      }
    }
  }

  // 3. Fallback: If end anchor not found, check for nextStartAnchor
  if (endIdx === -1 && nextStartAnchor) {
    for (let i = startIdx + 1; i < sortedLines.length; i++) {
      if (isLineMatch(sortedLines[i].text, nextStartAnchor)) {
        const prevLine = sortedLines[i - 1];
        ymax = Math.max(ymin + 4, (prevLine ? prevLine.y + 4 : sortedLines[i].y - 1));
        endIdx = i - 1;
        break;
      }
    }
  }

  // 4. Ultimate Fallback: if end anchor and next start anchor are both not matched,
  // extend height to cover all remaining lines in this section (up to end of page lines)
  if (endIdx === -1) {
    const lastLineIdx = sortedLines.length - 1;
    const maxPageY = sortedLines[lastLineIdx].y + 5;
    ymax = Math.min(100, Math.max(ymin + 18, maxPageY));
  }

  // Ensure ymin < ymax
  if (ymin >= ymax) {
    ymax = ymin + 8;
  }

  ymin = Math.max(0, Math.min(ymin, 98));
  ymax = Math.max(ymin + 3, Math.min(ymax, 100));

  return {
    ymin,
    xmin: 2,
    ymax,
    xmax: 98
  };
}
