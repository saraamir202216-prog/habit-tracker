const express = require("express");
const requireAuth = require("../middleware/auth");
const {
  createHabit,
  listHabits,
  getHabit,
  updateHabit,
  deleteHabit,
} = require("../controllers/habitController");
const { markDone, unmarkDone, getLogs } = require("../controllers/logController");

const router = express.Router();

router.use(requireAuth); // every habit route requires a logged-in user

router.post("/", createHabit);
router.get("/", listHabits);
router.get("/:id", getHabit);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);

// Nested log routes: /api/habits/:habitId/logs
router.post("/:habitId/logs", markDone);
router.delete("/:habitId/logs/:date", unmarkDone);
router.get("/:habitId/logs", getLogs);

module.exports = router;
