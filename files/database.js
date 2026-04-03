/**
 * services/database.js
 * SQLite database service using better-sqlite3 (synchronous, no connection pool needed).
 * Handles schema creation and all ticket persistence operations.
 */

const Database = require("better-sqlite3");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/tickets.db");

let db;

/**
 * Initialize the database: create file, run migrations, return instance.
 */
function initDB() {
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id          TEXT PRIMARY KEY,
      message     TEXT NOT NULL,
      category    TEXT NOT NULL,
      priority    TEXT NOT NULL,
      priority_label TEXT NOT NULL,
      is_urgent   INTEGER NOT NULL DEFAULT 0,
      confidence  REAL NOT NULL DEFAULT 0,
      keywords    TEXT NOT NULL DEFAULT '[]',
      signals     TEXT NOT NULL DEFAULT '{}',
      created_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
  `);

  return db;
}

/**
 * Get the active DB instance (initializes if not already done).
 */
function getDB() {
  if (!db) initDB();
  return db;
}

/**
 * Insert a new analyzed ticket into the database.
 * @param {string} message - Original message
 * @param {object} analysis - Result from analyzeTicket()
 * @returns {object} Saved ticket record
 */
function saveTicket(message, analysis) {
  const database = getDB();
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO tickets (id, message, category, priority, priority_label, is_urgent, confidence, keywords, signals, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    message,
    analysis.category,
    analysis.priority,
    analysis.priorityLabel,
    analysis.isUrgent ? 1 : 0,
    analysis.confidence,
    JSON.stringify(analysis.keywords),
    JSON.stringify(analysis.signals),
    createdAt
  );

  return { id, message, ...analysis, createdAt };
}

/**
 * Retrieve recent tickets, latest first.
 * @param {number} limit - Max tickets to return (default 50)
 * @param {number} offset - Pagination offset (default 0)
 * @returns {Array} List of ticket records
 */
function getTickets(limit = 50, offset = 0) {
  const database = getDB();
  const rows = database
    .prepare(
      `SELECT * FROM tickets ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  return rows.map(deserializeTicket);
}

/**
 * Get a single ticket by ID.
 */
function getTicketById(id) {
  const database = getDB();
  const row = database.prepare(`SELECT * FROM tickets WHERE id = ?`).get(id);
  if (!row) return null;
  return deserializeTicket(row);
}

/**
 * Get total ticket count.
 */
function getTicketCount() {
  const database = getDB();
  const row = database.prepare(`SELECT COUNT(*) as count FROM tickets`).get();
  return row.count;
}

/**
 * Deserialize JSON fields from SQLite row.
 */
function deserializeTicket(row) {
  return {
    id: row.id,
    message: row.message,
    category: row.category,
    priority: row.priority,
    priorityLabel: row.priority_label,
    isUrgent: row.is_urgent === 1,
    confidence: row.confidence,
    keywords: JSON.parse(row.keywords || "[]"),
    signals: JSON.parse(row.signals || "{}"),
    createdAt: row.created_at
  };
}

/**
 * Close DB connection — used in tests to avoid open handles.
 */
function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDB, getDB, saveTicket, getTickets, getTicketById, getTicketCount, closeDB };
