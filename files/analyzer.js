/**
 * services/analyzer.js
 * Local NLP / heuristic-based ticket analysis engine.
 * No external APIs — all classification is keyword-driven with weighted scoring.
 */

const {
  CATEGORIES,
  URGENCY_KEYWORDS,
  PRIORITY_SIGNALS,
  SECURITY_KEYWORDS
} = require("../config/rules");

/**
 * Normalize text: lowercase, remove punctuation for consistent matching.
 */
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, " ");
}

/**
 * Count how many keywords from a list appear in the normalized message.
 * Returns { count, matched: [] }
 */
function matchKeywords(normalizedText, keywords) {
  const matched = [];
  for (const kw of keywords) {
    const normalized = kw.toLowerCase();
    // Use word-boundary-like check: surrounded by spaces or start/end
    if (normalizedText.includes(normalized)) {
      matched.push(kw);
    }
  }
  return { count: matched.length, matched };
}

/**
 * Classify the ticket into a category.
 * Returns { category, matchedKeywords, scores }
 */
function classifyCategory(normalizedText) {
  // CUSTOM RULE: Security escalation — check first
  const securityMatch = matchKeywords(normalizedText, SECURITY_KEYWORDS);
  if (securityMatch.count > 0) {
    return {
      category: "Security",
      matchedKeywords: securityMatch.matched,
      scores: { Security: securityMatch.count }
    };
  }

  const scores = {};
  const matchedPerCategory = {};

  for (const [category, config] of Object.entries(CATEGORIES)) {
    const { count, matched } = matchKeywords(normalizedText, config.keywords);
    scores[category] = count * config.weight;
    matchedPerCategory[category] = matched;
  }

  // Pick the category with the highest score
  let bestCategory = "Other";
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  const allMatched = Object.values(matchedPerCategory).flat();
  return {
    category: bestCategory,
    matchedKeywords: matchedPerCategory[bestCategory] || [],
    scores
  };
}

/**
 * Detect urgency: returns true if any urgency keyword is present.
 */
function detectUrgency(normalizedText) {
  const { count, matched } = matchKeywords(normalizedText, URGENCY_KEYWORDS);
  return { isUrgent: count > 0, urgencySignals: matched };
}

/**
 * Assign priority based on priority signals and urgency.
 * CUSTOM RULE: Security tickets always get P0.
 */
function assignPriority(normalizedText, category, isUrgent) {
  // CUSTOM RULE: Security always P0
  if (category === "Security") {
    return { priority: "P0", priorityLabel: "Critical", signals: ["security escalation"] };
  }

  for (const [priority, config] of Object.entries(PRIORITY_SIGNALS)) {
    const { count, matched } = matchKeywords(normalizedText, config.keywords);
    if (count > 0) {
      // If already P2 or P3 but urgency detected, bump up one level
      if (isUrgent && priority === "P2") return { priority: "P1", priorityLabel: "High", signals: matched };
      if (isUrgent && priority === "P3") return { priority: "P2", priorityLabel: "Medium", signals: matched };
      return { priority, priorityLabel: config.label, signals: matched };
    }
  }

  // Default priority
  return { priority: isUrgent ? "P1" : "P3", priorityLabel: isUrgent ? "High" : "Low", signals: [] };
}

/**
 * Calculate confidence score (0.0 – 1.0) based on total keyword matches
 * relative to the message length. More matches = higher confidence.
 */
function calculateConfidence(matchedKeywords, prioritySignals, urgencySignals, textLength) {
  const totalMatches = matchedKeywords.length + prioritySignals.length + urgencySignals.length;
  const wordCount = Math.max(textLength.split(/\s+/).length, 1);

  // Base confidence: ratio of signal matches to word count, capped at 0.95
  let confidence = Math.min(totalMatches / (wordCount * 0.5), 0.95);

  // Minimum confidence floor: at least 0.1 if we have any match, else 0.05
  if (totalMatches > 0 && confidence < 0.1) confidence = 0.1;
  if (totalMatches === 0) confidence = 0.05;

  return Math.round(confidence * 100) / 100;
}

/**
 * Extract top relevant keywords for display (deduplicated, max 10).
 */
function extractKeywords(categoryMatched, prioritySignals, urgencySignals) {
  const all = [...new Set([...categoryMatched, ...prioritySignals, ...urgencySignals])];
  return all.slice(0, 10);
}

/**
 * Main analyze function — entry point for the service layer.
 * @param {string} message - Raw ticket message
 * @returns {object} analysis result
 */
function analyzeTicket(message) {
  if (!message || typeof message !== "string") {
    throw new Error("Message must be a non-empty string");
  }

  const trimmed = message.trim();
  const normalized = normalize(trimmed);

  const { category, matchedKeywords } = classifyCategory(normalized);
  const { isUrgent, urgencySignals } = detectUrgency(normalized);
  const { priority, priorityLabel, signals: prioritySignals } = assignPriority(normalized, category, isUrgent);
  const confidence = calculateConfidence(matchedKeywords, prioritySignals, urgencySignals, trimmed);
  const keywords = extractKeywords(matchedKeywords, prioritySignals, urgencySignals);

  return {
    category,
    priority,
    priorityLabel,
    isUrgent,
    confidence,
    keywords,
    signals: {
      categorySignals: matchedKeywords,
      prioritySignals,
      urgencySignals
    }
  };
}

module.exports = { analyzeTicket, normalize, matchKeywords, classifyCategory, detectUrgency, assignPriority, calculateConfidence };
