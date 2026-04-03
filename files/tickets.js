/**
 * routes/tickets.js
 * Route definitions with input validation middleware.
 */

const express = require("express");
const { body } = require("express-validator");
const {
  analyzeTicketHandler,
  listTicketsHandler,
  getTicketHandler
} = require("../controllers/ticketsController");

const router = express.Router();

// Validation rules for POST /tickets/analyze
const analyzeValidation = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required.")
    .isLength({ min: 5, max: 5000 })
    .withMessage("Message must be between 5 and 5000 characters.")
];

router.post("/analyze", analyzeValidation, analyzeTicketHandler);
router.get("/", listTicketsHandler);
router.get("/:id", getTicketHandler);

module.exports = router;
