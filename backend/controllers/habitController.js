const Habit = require("../models/Habit");
const DailyLog = require("../models/DailyLog");
const { computeStreaks } = require("../utils/streak");

function validateSchedule(body) {
  const { schedule_type, days_of_week, target_count } = body;

  if (!["daily", "specific_days", "weekly_target"].includes(schedule_type)) {
    return "schedule_type must be daily, specific_days, or weekly_target";
  }
  if (schedule_type === "specific_days") {
    if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
      return "days_of_week must be a non-empty array (0=Sun..6=Sat) for specific_days habits";
    }
  }
  if (schedule_type === "weekly_target") {
    if (!Number.isInteger(target_count) || target_count < 1 || target_count > 7) {
      return "target_count must be an integer between 1 and 7 for weekly_target habits";
    }
  }
  return null;
}

/**
 * Recompute a habit's current/longest streak from its full log history
 * and persist the result. Recomputing on read (rather than trusting a
 * stale cached value) matters here because time passing alone - with
 * no new log - can break a streak (e.g. today rolled past a missed
 * expected day).
 */
async function withFreshStreak(habit) {
  const logs = await DailyLog.find({ habit_id: habit._id }).select(
    "completed_date -_id"
  );
  const dates = logs.map((l) => l.completed_date);
  const { current_streak, longest_streak } = computeStreaks(habit, dates);

  if (
    habit.current_streak !== current_streak ||
    habit.longest_streak !== longest_streak
  ) {
    habit.current_streak = current_streak;
    habit.longest_streak = longest_streak;
    await habit.save();
  }

  return habit;
}

// FR-03 / FR-04: create a habit with a schedule
async function createHabit(req, res) {
  try {
    const error = validateSchedule(req.body);
    if (error) return res.status(400).json({ message: error });

    const { name, schedule_type, days_of_week, target_count } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Habit name is required" });
    }

    const habit = await Habit.create({
      user_id: req.userId,
      name: name.trim(),
      schedule_type,
      days_of_week: schedule_type === "specific_days" ? days_of_week : [],
      target_count: schedule_type === "weekly_target" ? target_count : null,
    });

    res.status(201).json({ habit });
  } catch (err) {
    res.status(500).json({ message: "Failed to create habit", error: err.message });
  }
}

// List all habits belonging to the logged-in user, each with a fresh streak
async function listHabits(req, res) {
  try {
    const habits = await Habit.find({ user_id: req.userId }).sort({
      created_at: -1,
    });
    const fresh = await Promise.all(habits.map(withFreshStreak));
    res.json({ habits: fresh });
  } catch (err) {
    res.status(500).json({ message: "Failed to load habits", error: err.message });
  }
}

// Single habit, scoped to the logged-in user (FR-13)
async function getHabit(req, res) {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    await withFreshStreak(habit);
    res.json({ habit });
  } catch (err) {
    res.status(500).json({ message: "Failed to load habit", error: err.message });
  }
}

// FR-05: edit a habit
async function updateHabit(req, res) {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const merged = { ...habit.toObject(), ...req.body };
    const error = validateSchedule(merged);
    if (error) return res.status(400).json({ message: error });

    if (req.body.name !== undefined) habit.name = req.body.name.trim();
    if (req.body.schedule_type !== undefined) {
      habit.schedule_type = req.body.schedule_type;
      habit.days_of_week =
        req.body.schedule_type === "specific_days"
          ? req.body.days_of_week || []
          : [];
      habit.target_count =
        req.body.schedule_type === "weekly_target"
          ? req.body.target_count
          : null;
    }

    await habit.save();
    await withFreshStreak(habit);
    res.json({ habit });
  } catch (err) {
    res.status(500).json({ message: "Failed to update habit", error: err.message });
  }
}

// FR-05: delete a habit (and its logs, so nothing orphaned is left behind)
async function deleteHabit(req, res) {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      user_id: req.userId,
    });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    await DailyLog.deleteMany({ habit_id: habit._id });
    res.json({ message: "Habit deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete habit", error: err.message });
  }
}

module.exports = {
  createHabit,
  listHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  withFreshStreak,
};
