# 🎫 AI-Powered Support Ticket Triage

A full-stack application that classifies and prioritizes support tickets using local heuristic-based NLP — no external AI APIs.

---

## 🚀 Quick Start (Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on Windows

### Run the app

```bash
# Clone / unzip the project, then:
cd ai-ticket-triage

# Build and start all services
docker-compose up --build

# Open the app
# Frontend: http://localhost:8080
# Backend API: http://localhost:3001
# Health check: http://localhost:3001/health
```

### Stop the app

```bash
docker-compose down
```

### Persistent data
SQLite data persists in a Docker volume (`ticket_triage_db`). To reset:
```bash
docker-compose down -v
```

---

## 🛠️ Local Development (Without Docker)

### Backend

```bash
cd backend
npm install
npm run dev        # starts on http://localhost:3001
```

### Run Tests

```bash
cd backend
npm test           # Jest with coverage
```

### Frontend

Open `frontend/index.html` directly in your browser.  
(The frontend calls `http://localhost:3001` by default.)

---

## 📡 API Reference

### `POST /tickets/analyze`

Analyzes a support ticket message and persists it.

**Request:**
```json
{ "message": "I was charged twice on my invoice, need urgent refund" }
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "...",
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
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
}
```

### `GET /tickets?limit=50&offset=0`

Returns recent tickets (latest first).

### `GET /tickets/:id`

Returns a single ticket by ID.

### `GET /health`

Returns `{ "status": "ok" }`.

---

## 🏗️ Architecture

```
ai-ticket-triage/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── rules.js          ← All keyword rules (config-driven)
│   │   ├── services/
│   │   │   ├── analyzer.js       ← NLP/heuristic classification engine
│   │   │   └── database.js       ← SQLite persistence layer
│   │   ├── controllers/
│   │   │   └── ticketsController.js  ← Request/response handling
│   │   ├── routes/
│   │   │   └── tickets.js        ← Route definitions + input validation
│   │   └── index.js              ← Express app bootstrap
│   └── tests/
│       └── analyzer.test.js      ← Unit tests
├── frontend/
│   ├── index.html                ← Single-page UI (HTML/CSS/JS)
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

### Separation of Concerns

| Layer | File | Responsibility |
|---|---|---|
| Config | `config/rules.js` | All keyword lists, weights — no logic |
| Analyzer | `services/analyzer.js` | Pure NLP functions, no DB or HTTP |
| Database | `services/database.js` | All SQLite operations |
| Controller | `controllers/ticketsController.js` | Validation, call services, format responses |
| Router | `routes/tickets.js` | URL mapping + validation middleware |

---

## 🤖 AI / NLP Classification Logic

All classification is **local and heuristic-based** — no external APIs.

### Pipeline

```
Raw message
    ↓
Normalize (lowercase + strip punctuation)
    ↓
Security Check (custom rule — see below)
    ↓
Category Classification (keyword scoring per category)
    ↓
Urgency Detection (predefined urgency terms)
    ↓
Priority Assignment (signal matching + urgency bump)
    ↓
Confidence Scoring (match count / word count ratio)
    ↓
Keyword Extraction (top 10 deduplicated signals)
```

### Categories
`Billing`, `Technical`, `Account`, `Feature Request`, `Security` (custom), `Other`

### Priority Levels
| Priority | Label | Example Signals |
|---|---|---|
| P0 | Critical | production down, data loss, security breach |
| P1 | High | urgent, blocking, cannot work |
| P2 | Medium | error, bug, slow, overcharged |
| P3 | Low | question, suggestion, feature request |

**Urgency bump:** A P2 ticket becomes P1, and P3 becomes P2, if urgency keywords are detected.

---

## 🔐 Custom Rule: Security Escalation

**Rule:** Any ticket containing security-related keywords (`hacked`, `breach`, `compromised`, `unauthorized access`, `phishing`, `malware`, `data leak`, etc.) is **immediately classified as `Security` category and escalated to `P0` (Critical)**, bypassing all other scoring.

**Rationale:** Security incidents carry the highest potential for data exposure, regulatory liability, and reputational damage. A regular scoring approach could under-prioritize a security issue if it contains ambiguous language (e.g., "I think someone may have accessed my account"). By making security a hard override, we ensure these tickets are never delayed by the classifier.

**Demo examples:**
- `"I think my account was hacked, everything looks wrong"` → Security / P0
- `"We received a phishing email pretending to be your company"` → Security / P0
- `"There may be unauthorized access to our data"` → Security / P0

---

## 🗃️ Data Model

```sql
CREATE TABLE tickets (
  id            TEXT PRIMARY KEY,       -- UUID v4
  message       TEXT NOT NULL,          -- original ticket text
  category      TEXT NOT NULL,          -- classified category
  priority      TEXT NOT NULL,          -- P0–P3
  priority_label TEXT NOT NULL,         -- Critical/High/Medium/Low
  is_urgent     INTEGER NOT NULL,       -- 0 or 1 (SQLite boolean)
  confidence    REAL NOT NULL,          -- 0.0–0.95
  keywords      TEXT NOT NULL,          -- JSON array
  signals       TEXT NOT NULL,          -- JSON object with signal breakdown
  created_at    TEXT NOT NULL           -- ISO 8601 timestamp
);
```

**Why SQLite?** Zero-configuration, no separate container, file-based, and perfect for this scale. Data persists via a Docker named volume. Upgrade path to Postgres requires only changing the `better-sqlite3` calls in `database.js`.

---

## 🧪 Tests

```bash
cd backend && npm test
```

Tests cover:
- `normalize()` — text normalization
- `matchKeywords()` — keyword matching
- `classifyCategory()` — all 5 categories + custom security rule
- `detectUrgency()` — urgency signal detection
- `assignPriority()` — all priority levels + urgency bump + security P0 override
- `calculateConfidence()` — confidence scoring bounds
- `analyzeTicket()` — end-to-end integration tests

---

## 💭 Reflection

### Design Decisions

**Config-driven rules (`config/rules.js`):** All keyword lists live in one file. This means product/support teams can tune classification accuracy without touching business logic — a critical operational requirement for production triage systems.

**`better-sqlite3` (synchronous):** Express is single-threaded anyway, and synchronous SQLite is measurably simpler — no async/await in the DB layer, no connection pooling, no race conditions. For this scale it's the correct choice.

**Confidence scoring:** Rather than a simple boolean "matched/didn't match", the confidence score (keyword matches normalized by word count) gives operators a sense of how reliable the classification is. A 0.05 confidence ticket probably needs manual review; 0.85 likely doesn't.

**Single-file frontend:** Plain HTML/CSS/JS with zero build steps means the frontend Dockerfile is trivially simple (just nginx). For a triage tool used internally, this is completely sufficient.

### Trade-offs

- **Recall vs. precision:** Keyword matching has high false-positive rates for short messages. A statistical model (TF-IDF, naive Bayes) would improve precision but would require training data and a heavier runtime.
- **No stemming/lemmatization:** "charge", "charged", "charges" are all separate keywords. Adding a stemmer (e.g., Porter) would reduce the keyword list size and improve recall — but adds complexity.
- **Priority conflicts:** A ticket can match signals at multiple priority levels; we take the first (highest) match. A weighted average approach would be more nuanced.

### What I'd Improve With More Time

1. **ML classifier** — train a lightweight naive Bayes or logistic regression model on labeled support ticket datasets (e.g., from Kaggle) to replace keyword scoring.
2. **Admin dashboard** — filter by category/priority, bulk-assign agents, mark tickets resolved.
3. **Stemming + synonym expansion** — use `natural` (Node.js NLP library) for stemming so "payment", "paying", "paid" all map to the same root.
4. **Webhook/notification system** — P0/Security tickets should fire a Slack/PagerDuty alert instantly.
5. **Pagination in UI** — the table currently loads last 50 tickets; proper cursor-based pagination would scale better.
6. **Rate limiting** — add `express-rate-limit` to the `/tickets/analyze` endpoint to prevent abuse.
