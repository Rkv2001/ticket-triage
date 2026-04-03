# ticket-triage
Project outline  
ai-ticket-triage/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                  ← Express app entry point
│       ├── config/rules.js           ← All keyword rules (config-driven)
│       ├── services/analyzer.js      ← NLP classification engine
│       ├── services/database.js      ← SQLite persistence
│       ├── controllers/ticketsController.js
│       ├── routes/tickets.js
│       └── tests/analyzer.test.js    ← 20 unit tests
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── index.html                    ← Full UI (dark theme)
