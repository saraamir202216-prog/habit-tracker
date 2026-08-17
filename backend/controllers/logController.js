const Habit = require("../models/Habit");
const DailyLog = require("../models/DailyLog");
const { todayStr } = require("../utils/streak");
const { withFreshStreak } = require("./habitController");

async function getOwnedHabit(habitId, userId) {
  return Habit.findOne({ _id: habitId, user_id: userId });
}

// FR-06: mark a habit completed for a given date (defaults to today)
async function markDone(req, res) {
  try {
    const habit = await getOwnedHabit(req.params.habitId, req.userId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const completed_date = req.body.date || todayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completed_date)) {
      return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
    }
    // Assumption (SRS Section 8): no logging future dates
    if (completed_date > todayStr()) {
      return res.status(400).json({ message: "Cannot log a future date" });
    }

    await DailyLog.updateOne(
      { habit_id: habit._id, completed_date },
      { $setOnInsert: { user_id: req.userId, habit_id: habit._id, completed_date } },
      { upsert: true }
    );

    await withFreshStreak(habit);
    res.status(201).json({ habit });
  } catch (err) {
    res.status(500).json({ message: "Failed to log habit", error: err.message });
  }
}

// FR-07: undo / un-mark a completion for a given date
async function unmarkDone(req, res) {
  try {
    const habit = await getOwnedHabit(req.params.habitId, req.userId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const completed_date = req.params.date;
    await DailyLog.deleteOne({ habit_id: habit._id, completed_date });

    await withFreshStreak(habit);
    res.json({ habit });
  } catch (err) {
    res.status(500).json({ message: "Failed to undo log", error: err.message });
  }
}

// FR-12 / FR-14: completion history for the calendar/heatmap view
async function getLogs(req, res) {
  try {
    const habit = await getOwnedHabit(req.params.habitId, req.userId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const logs = await DailyLog.find({ habit_id: habit._id })
      .select("completed_date -_id")
      .sort({ completed_date: 1 });

    res.json({ dates: logs.map((l) => l.completed_date) });
  } catch (err) {
    res.status(500).json({ message: "Failed to load logs", error: err.message });
  }
}

module.exports = { markDone, unmarkDone, getLogs };
