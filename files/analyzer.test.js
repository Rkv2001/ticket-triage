/**
 * tests/analyzer.test.js
 * Unit tests for the NLP classification and priority logic.
 */

const {
  analyzeTicket,
  normalize,
  matchKeywords,
  classifyCategory,
  detectUrgency,
  assignPriority,
  calculateConfidence
} = require("../src/services/analyzer");

// ── normalize ─────────────────────────────────────────────────────────────────
describe("normalize()", () => {
  test("lowercases text", () => {
    expect(normalize("HELLO WORLD")).toBe("hello world");
  });

  test("removes punctuation", () => {
    expect(normalize("error! can't login.")).toBe("error  can t login ");
  });

  test("handles empty string", () => {
    expect(normalize("")).toBe("");
  });
});

// ── matchKeywords ─────────────────────────────────────────────────────────────
describe("matchKeywords()", () => {
  test("finds matching keywords", () => {
    const result = matchKeywords("my billing is wrong", ["billing", "invoice"]);
    expect(result.count).toBe(1);
    expect(result.matched).toContain("billing");
  });

  test("returns 0 matches for no keywords", () => {
    const result = matchKeywords("random text here", ["billing", "payment"]);
    expect(result.count).toBe(0);
  });

  test("handles multiple matches", () => {
    const result = matchKeywords("billing invoice payment", ["billing", "invoice", "payment"]);
    expect(result.count).toBe(3);
  });
});

// ── classifyCategory ──────────────────────────────────────────────────────────
describe("classifyCategory()", () => {
  test("classifies billing ticket", () => {
    const { category } = classifyCategory(normalize("I was charged twice on my invoice"));
    expect(category).toBe("Billing");
  });

  test("classifies technical ticket", () => {
    const { category } = classifyCategory(normalize("The app keeps crashing with a 500 error"));
    expect(category).toBe("Technical");
  });

  test("classifies account ticket", () => {
    const { category } = classifyCategory(normalize("I cannot login, forgot my password"));
    expect(category).toBe("Account");
  });

  test("classifies feature request", () => {
    const { category } = classifyCategory(normalize("Would be great to add dark mode support"));
    expect(category).toBe("Feature Request");
  });

  test("defaults to Other for unclear message", () => {
    const { category } = classifyCategory(normalize("Hello, I have a question"));
    expect(category).toBe("Other");
  });

  // CUSTOM RULE TEST
  test("classifies security ticket regardless of other signals", () => {
    const { category } = classifyCategory(normalize("I think my account was hacked, billing looks wrong too"));
    expect(category).toBe("Security");
  });

  test("detects phishing as security", () => {
    const { category } = classifyCategory(normalize("I received a phishing email pretending to be your company"));
    expect(category).toBe("Security");
  });
});

// ── detectUrgency ─────────────────────────────────────────────────────────────
describe("detectUrgency()", () => {
  test("detects urgent keyword", () => {
    const { isUrgent } = detectUrgency(normalize("This is urgent please fix asap"));
    expect(isUrgent).toBe(true);
  });

  test("detects blocking keyword", () => {
    const { isUrgent, urgencySignals } = detectUrgency(normalize("This is blocking our release"));
    expect(isUrgent).toBe(true);
    expect(urgencySignals).toContain("blocking");
  });

  test("not urgent for casual message", () => {
    const { isUrgent } = detectUrgency(normalize("Just a quick question about pricing"));
    expect(isUrgent).toBe(false);
  });
});

// ── assignPriority ────────────────────────────────────────────────────────────
describe("assignPriority()", () => {
  test("assigns P0 for production down", () => {
    const { priority } = assignPriority(normalize("production down all users affected"), "Technical", false);
    expect(priority).toBe("P0");
  });

  test("assigns P0 for Security category (custom rule)", () => {
    const { priority, signals } = assignPriority(normalize("my account was hacked"), "Security", false);
    expect(priority).toBe("P0");
    expect(signals).toContain("security escalation");
  });

  test("assigns P1 for urgent/blocking", () => {
    const { priority } = assignPriority(normalize("urgent blocker cannot work"), "Technical", true);
    expect(priority).toBe("P1");
  });

  test("bumps P2 to P1 when urgent flag is true", () => {
    const { priority } = assignPriority(normalize("there is a bug in the error report"), "Technical", true);
    expect(priority).toBe("P1");
  });

  test("assigns P3 for feature request", () => {
    const { priority } = assignPriority(normalize("how to export data"), "Feature Request", false);
    expect(priority).toBe("P3");
  });
});

// ── calculateConfidence ───────────────────────────────────────────────────────
describe("calculateConfidence()", () => {
  test("returns higher confidence with more matches", () => {
    const low = calculateConfidence([], [], [], "some text here");
    const high = calculateConfidence(["billing", "invoice", "payment"], ["urgent"], ["asap"], "billing invoice payment urgent asap refund");
    expect(high).toBeGreaterThan(low);
  });

  test("returns minimum 0.05 for no matches", () => {
    expect(calculateConfidence([], [], [], "hello world")).toBe(0.05);
  });

  test("caps confidence at 0.95", () => {
    const huge = Array(50).fill("keyword");
    const confidence = calculateConfidence(huge, huge, huge, "a b");
    expect(confidence).toBeLessThanOrEqual(0.95);
  });
});

// ── analyzeTicket (integration) ───────────────────────────────────────────────
describe("analyzeTicket()", () => {
  test("returns complete analysis object", () => {
    const result = analyzeTicket("I was charged twice on my billing invoice, please refund asap");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("priority");
    expect(result).toHaveProperty("priorityLabel");
    expect(result).toHaveProperty("isUrgent");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("keywords");
    expect(result).toHaveProperty("signals");
  });

  test("handles security escalation end-to-end", () => {
    const result = analyzeTicket("I think our system was compromised and data was breached");
    expect(result.category).toBe("Security");
    expect(result.priority).toBe("P0");
    expect(result.isUrgent).toBe(false); // urgency is separate from security escalation
  });

  test("throws on empty message", () => {
    expect(() => analyzeTicket("")).toThrow();
  });

  test("throws on non-string input", () => {
    expect(() => analyzeTicket(null)).toThrow();
  });

  test("handles feature request correctly", () => {
    const result = analyzeTicket("Would be great if you could add CSV export feature to the dashboard");
    expect(result.category).toBe("Feature Request");
    expect(result.priority).toBe("P3");
  });
});
