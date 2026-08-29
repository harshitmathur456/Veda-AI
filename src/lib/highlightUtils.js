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
  
  // 1. Direct inclusion of clean anchor in clean line
  if (cleanLine.includes(cleanAnchor)) return true;
  
  // 2. Tokenize and filter out single-character tokens to prevent false matches on sub-part labels (e.g. "a", "i")
  const lineWords = cleanLine.split(" ").filter(w => w.length > 1);
  const anchorWords = cleanAnchor.split(" ").filter(w => w.length > 1);
  
  if (lineWords.length === 0 || anchorWords.length === 0) {
    // Fall back to exact string match for very short inputs
    return cleanLine === cleanAnchor;
  }
  
  // Count how many anchor words are present in the line
  let matchCount = 0;
  anchorWords.forEach(w => {
    if (cleanLine.includes(w)) {
      matchCount++;
    }
  });
  
  // Accept if at least 50% of the anchor words match
  const requiredMatches = Math.max(1, Math.ceil(anchorWords.length * 0.5));
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
    // Fallback if no page lines are available
    return { ymin: 10, xmin: 2, ymax: 90, xmax: 98 };
  }

  // 1. Find ymin (top edge)
  let ymin = 0;
  let startIdx = -1;
  
  if (startAnchor) {
    // Try to find the line that contains the start anchor (or matches it best)
    for (let i = 0; i < sortedLines.length; i++) {
      if (isLineMatch(sortedLines[i].text, startAnchor)) {
        ymin = sortedLines[i].y;
        startIdx = i;
        break;
      }
    }
  }

  // If start anchor not found in lines, default to first line's Y
  if (startIdx === -1) {
    ymin = sortedLines[0].y;
    startIdx = 0;
  }

  // 2. Find ymax (bottom edge)
  let ymax = 100;
  let endIdx = -1;

  if (endAnchor) {
    // Search starting from startIdx to ensure we find the end anchor after the start anchor
    for (let i = startIdx; i < sortedLines.length; i++) {
      if (isLineMatch(sortedLines[i].text, endAnchor)) {
        ymax = sortedLines[i].y + 4; // Add typical line height offset
        endIdx = i;
        break;
      }
    }
  }

  // 3. Fallback: If end anchor not found or invalid, use nextStartAnchor
  if (endIdx === -1 && nextStartAnchor) {
    for (let i = startIdx + 1; i < sortedLines.length; i++) {
      if (isLineMatch(sortedLines[i].text, nextStartAnchor)) {
        ymax = Math.max(ymin + 2, sortedLines[i].y - 1); // 1% margin before next answer
        endIdx = i;
        break;
      }
    }
  }

  // 4. Ultimate Fallback: if still not found, check next line or cap at bottom
  if (endIdx === -1) {
    if (startIdx < sortedLines.length - 1) {
      // If there are more lines, default to the next line's Y
      ymax = sortedLines[startIdx + 1].y - 1;
    } else {
      ymax = Math.min(100, ymin + 15); // Default to a standard height band
    }
  }

  // Ensure ymin < ymax
  if (ymin >= ymax) {
    ymax = ymin + 5;
  }

  // Keep coords within safe bounds
  ymin = Math.max(0, Math.min(ymin, 98));
  ymax = Math.max(ymin + 2, Math.min(ymax, 100));

  return {
    ymin,
    xmin: 2, // Slightly offset from left edge for clean UI padding
    ymax,
    xmax: 98 // Slightly offset from right edge
  };
}
