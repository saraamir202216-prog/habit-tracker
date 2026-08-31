const express = require("express");

const requireAuth = require("../middleware/auth");

const {
  createHabit,
  listHabits,
  getHabit,
  updateHabit,
  deleteHabit,
} = require("../controllers/habitController");

const {
  markDone,
  unmarkDone,
  getLogs,
  getAllUserLogs,
} = require("../controllers/logController");

const router = express.Router();

router.use(requireAuth);

// Habit routes
router.post("/", createHabit);

router.get("/", listHabits);

// IMPORTANT:
// This must come BEFORE /:id
// otherwise "all-logs" could be treated as an id.
router.get("/all-logs", getAllUserLogs);

router.get("/:id", getHabit);

router.put("/:id", updateHabit);

router.delete("/:id", deleteHabit);

// Nested log routes
router.post("/:habitId/logs", markDone);

router.delete(
  "/:habitId/logs/:date",
  unmarkDone
);

router.get(
  "/:habitId/logs",
  getLogs
);

module.exports = router;