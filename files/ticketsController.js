/**
 * controllers/ticketsController.js
 * Handles HTTP request validation, calls service layer, returns responses.
 * Separation of concerns: no business logic lives here.
 */

const { validationResult } = require("express-validator");
const { analyzeTicket } = require("../services/analyzer");
const { saveTicket, getTickets, getTicketById, getTicketCount } = require("../services/database");

/**
 * POST /tickets/analyze
 * Accepts a ticket message, analyzes it, persists it, returns full result.
 */
async function analyzeTicketHandler(req, res) {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }

  const { message } = req.body;

  try {
    // Run NLP analysis
    const analysis = analyzeTicket(message);

    // Persist to database
    const saved = saveTicket(message, analysis);

    return res.status(201).json({
      success: true,
      data: {
        id: saved.id,
        message: saved.message,
        category: saved.category,
        priority: saved.priority,
        priorityLabel: saved.priorityLabel,
        isUrgent: saved.isUrgent,
        confidence: saved.confidence,
        keywords: saved.keywords,
        signals: saved.signals,
        createdAt: saved.createdAt
      }
    });
  } catch (err) {
    console.error("[analyzeTicket] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to analyze ticket. Please try again."
    });
  }
}

/**
 * GET /tickets
 * Returns paginated list of analyzed tickets, latest first.
 * Query params: limit (default 50), offset (default 0)
 */
function listTicketsHandler(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const tickets = getTickets(limit, offset);
    const total = getTicketCount();

    return res.status(200).json({
      success: true,
      data: {
        tickets,
        total,
        limit,
        offset
      }
    });
  } catch (err) {
    console.error("[listTickets] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve tickets."
    });
  }
}

/**
 * GET /tickets/:id
 * Returns a single ticket by ID.
 */
function getTicketHandler(req, res) {
  try {
    const ticket = getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket not found." });
    }
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    console.error("[getTicket] Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to retrieve ticket." });
  }
}

module.exports = { analyzeTicketHandler, listTicketsHandler, getTicketHandler };
