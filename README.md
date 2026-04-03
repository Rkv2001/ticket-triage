# 🎫 AI-Powered Support Ticket Triage

## ✨ Features

- 🤖 **Local NLP engine** — keyword-based classification with confidence scoring, no external APIs
- 🗂️ **6 categories** — Billing, Technical, Account, Feature Request, Security *(custom)*, Other
- 🚨 **4 priority levels** — P0 Critical → P3 Low, with automatic urgency bumping
- 🔐 **Security escalation rule** — any security-related ticket is instantly forced to P0
- 💾 **SQLite persistence** — all tickets stored and retrievable with pagination
- 🖥️ **Dark-themed UI** — submit tickets, view live results, browse history table
- 🧪 **20 unit tests** — full Jest coverage across all classification logic
- 🐳 **Docker ready** — single `docker-compose up --build` runs everything

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run with Docker *(recommended)*

```bash
# 1. Clone the repo
git clone https://github.com/your-username/ai-ticket-triage.git
cd ai-ticket-triage

# 2. Build and start all services
docker-compose up --build
```

| Service | URL |
|---------|-----|
| 🖥️ Frontend | http://localhost:8080 |
| ⚙️ Backend API | http://localhost:3001 |
| ❤️ Health Check | http://localhost:3001/health |

```bash
# Stop all services
docker-compose down

# Stop and wipe database
docker-compose down -v
```

---

### Run Locally *(without Docker)*

**Backend:**
```bash
cd backend
npm install
npm run dev        # → http://localhost:3001
```

**Frontend:**
```
Open frontend/index.html directly in your browser
```

**Tests:**
```bash
cd backend
npm test           # Jest with coverage report
```

---

## 📡 API Reference

### `POST /tickets/analyze`
Analyze and persist a support ticket.

**Request body:**
```json
{
  "message": "I was charged twice on my invoice and need an urgent refund"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "b3d2f1a0-...",
    "message": "I was charged twice on my invoice and need an urgent refund",
    "category": "Billing",
    "priority": "P1",
    "priorityLabel": "High",
    "isUrgent": true,
    "confidence": 0.72,
    "keywords": ["charged", "invoice", "refund", "urgent"],
    "signals": {
      "categorySignals": ["charged", "invoice", "refund"],
      "prioritySignals": ["refund"],
      "urgencySignals": ["urgent"]
    },
    "createdAt": "2024-06-01T10:00:00.000Z"
  }
}
```

**Validation error `400`:**
```json
{
  "success": false,
  "errors": [{ "field": "message", "message": "Message must be between 5 and 5000 characters." }]
}
```

---

### `GET /tickets`
List recent tickets, latest first.

| Query param | Default | Description |
|-------------|---------|-------------|
| `limit` | `50` | Max results (capped at 100) |
| `offset` | `0` | Pagination offset |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "tickets": [...],
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

---

### `GET /tickets/:id`
Fetch a single ticket by UUID.

---

### `GET /health`
```json
{ "status": "ok", "timestamp": "2024-06-01T10:00:00.000Z" }
```

---

## 🏗️ Architecture

```
ai-ticket-triage/
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                        ← Express app bootstrap
│       ├── config/
│       │   └── rules.js                    ← All keyword rules (config-driven, no logic)
│       ├── services/
│       │   ├── analyzer.js                 ← Pure NLP classification engine
│       │   └── database.js                 ← SQLite persistence layer
│       ├── controllers/
│       │   └── ticketsController.js        ← HTTP request/response handling
│       ├── routes/
│       │   └── tickets.js                  ← Route definitions + validation middleware
│       └── tests/
│           └── analyzer.test.js            ← 20 Jest unit tests
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── index.html                          ← Single-page UI (HTML/CSS/JS, no build step)
```

### Layer Responsibilities

| Layer | File | Responsibility |
|-------|------|----------------|
| Config | `config/rules.js` | All keyword lists & weights — zero logic |
| Analyzer | `services/analyzer.js` | Pure NLP functions — no DB, no HTTP |
| Database | `services/database.js` | All SQLite read/write operations |
| Controller | `controllers/ticketsController.js` | Input validation → services → HTTP response |
| Router | `routes/tickets.js` | URL mapping + `express-validator` middleware |

---

## 🤖 NLP & Classification Logic

All classification runs **locally** — no external APIs or models are called.

### Processing Pipeline

```
Raw ticket message
        │
        ▼
┌─────────────────┐
│   Normalize     │  lowercase + strip punctuation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Security Check  │  ← Custom Rule (hard override → P0)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Categorize    │  keyword scoring across all categories
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Detect Urgency  │  match against urgency keyword list
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Assign Priority │  signal matching + urgency bump
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Confidence    │  match count ÷ word count (capped 0.95)
└────────┬────────┘
         │
         ▼
  Structured Result
```

### Categories

| Category | Example Triggers |
|----------|-----------------|
| `Billing` | invoice, charged, refund, subscription, payment |
| `Technical` | error, crash, 500, timeout, not working, outage |
| `Account` | password, login, locked, 2FA, reset, suspended |
| `Feature Request` | feature, suggestion, would be great, roadmap |
| `Security` ⚠️ | hacked, breach, phishing, unauthorized, malware |
| `Other` | anything with no strong signals |

### Priority Levels

| Priority | Label | Triggered By |
|----------|-------|--------------|
| **P0** | Critical | production down, data loss, security breach, outage |
| **P1** | High | urgent, blocking, cannot work, emergency |
| **P2** | Medium | error, bug, slow, overcharged, access denied |
| **P3** | Low | question, suggestion, feature request, feedback |

> **Urgency Bump:** If urgency keywords (`urgent`, `asap`, `blocking`, etc.) are detected, priority is automatically upgraded one level — P2 → P1, P3 → P2.

---

## 🔐 Custom Rule: Security Escalation

### Rule
Any ticket containing a security-related keyword — `hacked`, `breach`, `compromised`, `unauthorized access`, `phishing`, `malware`, `ransomware`, `data leak`, `suspicious login`, etc. — is **immediately classified as `Security` and forced to `P0 (Critical)`**, bypassing all other scoring.

### Rationale
Security incidents carry the highest potential for data exposure, regulatory liability (GDPR, SOC2), and reputational damage. A standard keyword-scoring approach risks under-prioritizing ambiguous language like *"I think someone may have accessed my account"* — which would normally score low.

By making security a **hard override**, we guarantee these tickets are never delayed or misclassified by the scoring system. The cost of a false negative here far outweighs the cost of a false positive.

### Demo Examples

| Input Message | Category | Priority |
|---------------|----------|----------|
| `"I think my account was hacked, everything looks wrong"` | Security | P0 |
| `"We received a phishing email pretending to be your company"` | Security | P0 |
| `"There may be unauthorized access to our production data"` | Security | P0 |
| `"Suspicious login detected from unknown IP"` | Security | P0 |

---

## 🗃️ Data Model

```sql
CREATE TABLE tickets (
  id             TEXT PRIMARY KEY,   -- UUID v4
  message        TEXT NOT NULL,      -- original ticket text
  category       TEXT NOT NULL,      -- classified category
  priority       TEXT NOT NULL,      -- P0 / P1 / P2 / P3
  priority_label TEXT NOT NULL,      -- Critical / High / Medium / Low
  is_urgent      INTEGER NOT NULL,   -- 0 or 1  (SQLite boolean)
  confidence     REAL NOT NULL,      -- 0.05 – 0.95
  keywords       TEXT NOT NULL,      -- JSON array of detected signals
  signals        TEXT NOT NULL,      -- JSON: { categorySignals, prioritySignals, urgencySignals }
  created_at     TEXT NOT NULL       -- ISO 8601 timestamp
);

CREATE INDEX idx_tickets_created_at ON tickets (created_at DESC);
```

**Why SQLite?** Zero configuration, no extra container, file-based, and perfectly sufficient at this scale. Data persists in a named Docker volume (`ticket_triage_db`). The only change needed to migrate to PostgreSQL is swapping the `better-sqlite3` calls in `services/database.js`.

---

## 🧪 Tests

```bash
cd backend
npm test
```

| Suite | What's Tested |
|-------|---------------|
| `normalize()` | Lowercasing, punctuation stripping |
| `matchKeywords()` | Single match, multiple matches, no match |
| `classifyCategory()` | All 5 categories + Security override + Other fallback |
| `detectUrgency()` | Urgency flag, signal extraction, non-urgent messages |
| `assignPriority()` | P0–P3 levels, urgency bump, Security → P0 override |
| `calculateConfidence()` | Bounds (0.05 min, 0.95 max), relative scoring |
| `analyzeTicket()` | End-to-end integration, null/empty input throws |

---

## 💭 Reflection

### Design Decisions

**Config-driven rules (`config/rules.js`):** All keyword lists and weights live in a single file with zero business logic. Product and support teams can tune classification accuracy without touching service code — critical for a production triage system where keyword lists need frequent updates.

**`better-sqlite3` (synchronous):** Express is single-threaded and synchronous SQLite is simpler — no async/await in the DB layer, no connection pools, no race conditions. For this workload it is the right tool.

**Confidence scoring as a float:** Rather than a binary matched/unmatched flag, a 0–1 confidence score lets downstream consumers decide their own review threshold. A 0.05 ticket needs a human; 0.85 probably does not.

**Single-file frontend:** Plain HTML/CSS/JS with no build step means the frontend Dockerfile is just an nginx static server. For an internal ops tool this is completely appropriate and keeps the demo reproducible everywhere.

### Trade-offs

- **Precision vs recall:** Keyword matching produces false positives for short or ambiguous messages. A statistical model (TF-IDF, naive Bayes) would improve precision but requires labeled training data.
- **No stemming:** `charge`, `charged`, and `charges` are treated as distinct keywords. A stemmer (Porter algorithm via the `natural` package) would shrink the keyword list and improve recall at the cost of added complexity.
- **First-match priority:** When a message matches multiple priority levels we take the highest match. A weighted voting approach would handle edge cases more gracefully.

### What I'd Improve With More Time

1. **ML classifier** — train a lightweight naive Bayes model on public support ticket datasets to replace pure keyword scoring
2. **Stemming + synonyms** — integrate `natural` (Node NLP) so morphological variants map to the same root
3. **Webhook alerting** — P0 / Security tickets should fire an instant Slack or PagerDuty notification
4. **Admin dashboard** — filter by category/priority, assign to agents, mark tickets resolved
5. **Rate limiting** — add `express-rate-limit` on `/tickets/analyze` to prevent abuse
6. **Cursor-based pagination** — replace offset pagination with cursor-based for large datasets

---

## 📄 License

MIT — feel free to use, modify, and distribute.
