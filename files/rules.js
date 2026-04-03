/**
 * config/rules.js
 * Central config-driven keyword rules for classification, priority, and urgency.
 * Modify this file to tune the AI/NLP logic without touching business logic.
 */

const CATEGORIES = {
  Billing: {
    keywords: [
      "bill", "billing", "invoice", "charge", "charged", "payment", "paid",
      "refund", "subscription", "plan", "price", "pricing", "cost", "fee",
      "overcharged", "credit", "debit", "transaction", "receipt", "renewal",
      "cancel subscription", "upgrade plan", "downgrade"
    ],
    weight: 1
  },
  Technical: {
    keywords: [
      "error", "bug", "crash", "broken", "not working", "down", "outage",
      "slow", "timeout", "500", "404", "failed", "failure", "issue", "problem",
      "exception", "stack trace", "server", "api", "endpoint", "login failed",
      "cannot connect", "connection refused", "latency", "performance", "freeze",
      "unresponsive", "blank screen", "white screen", "loading forever"
    ],
    weight: 1
  },
  Account: {
    keywords: [
      "account", "password", "login", "logout", "sign in", "sign up",
      "username", "email", "profile", "access", "locked", "banned", "suspended",
      "two factor", "2fa", "reset password", "forgot password", "verify",
      "verification", "permission", "role", "settings", "delete account",
      "close account", "deactivate"
    ],
    weight: 1
  },
  "Feature Request": {
    keywords: [
      "feature", "request", "suggestion", "idea", "would be great",
      "wish", "could you add", "please add", "enhancement", "improve",
      "improvement", "roadmap", "future", "consider", "feedback", "nice to have",
      "can you support", "integration", "support for", "allow us to"
    ],
    weight: 1
  }
};

const URGENCY_KEYWORDS = [
  "urgent", "urgently", "asap", "immediately", "critical", "emergency",
  "right now", "as soon as possible", "blocking", "blocker", "cannot work",
  "production down", "prod down", "outage", "all users affected", "data loss",
  "security breach", "hacked", "compromised", "business stopped"
];

const PRIORITY_SIGNALS = {
  P0: {
    keywords: [
      "production down", "prod down", "outage", "all users affected",
      "data loss", "security breach", "hacked", "compromised", "system down",
      "complete failure", "business stopped", "critical outage"
    ],
    label: "Critical"
  },
  P1: {
    keywords: [
      "urgent", "asap", "blocking", "blocker", "cannot work", "not working",
      "broken", "crash", "crashed", "emergency", "immediately", "major issue",
      "severely impacted", "revenue impacted"
    ],
    label: "High"
  },
  P2: {
    keywords: [
      "error", "bug", "issue", "problem", "slow", "timeout", "failed",
      "incorrect", "wrong", "unexpected", "refund", "overcharged",
      "access denied", "locked out"
    ],
    label: "Medium"
  },
  P3: {
    keywords: [
      "question", "how to", "wondering", "suggestion", "feature", "request",
      "feedback", "idea", "nice to have", "when will", "future"
    ],
    label: "Low"
  }
};

/**
 * CUSTOM RULE: Security Escalation
 * Rationale: Any ticket mentioning security-related terms (hacked, breach,
 * compromised, unauthorized access) is immediately escalated to P0 and
 * re-categorized to "Security" regardless of other signals. Security incidents
 * have the highest potential for damage (data exposure, legal liability) and
 * must be reviewed by a human instantly — no heuristic scoring should delay them.
 */
const SECURITY_KEYWORDS = [
  "hacked", "hack", "breach", "breached", "security", "unauthorized",
  "unauthorized access", "compromised", "exploit", "vulnerability",
  "phishing", "malware", "ransomware", "stolen data", "data leak",
  "credential stuffing", "brute force", "suspicious login", "intrusion"
];

module.exports = {
  CATEGORIES,
  URGENCY_KEYWORDS,
  PRIORITY_SIGNALS,
  SECURITY_KEYWORDS
};
