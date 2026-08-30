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
    if (
      !Number.isInteger(target_count) ||
      target_count < 1 ||
      target_count > 7
    ) {
      return "target_count must be an integer between 1 and 7 for weekly_target habits";
    }
  }

  return null;
}

/*
 * Optimized version:
 * Instead of querying DailyLog separately for every habit,
 * we fetch all logs for all the user's habits in ONE query.
 */
async function withFreshStreak(habit) {
  const logs = await DailyLog.find({ habit_id: habit._id })
    .select("completed_date -_id")
    .lean();

  const dates = logs.map((log) => log.completed_date);

  const {
    current_streak,
    longest_streak,
    pendingMissedDate,
    lastBrokenDate,
  } = computeStreaks(habit, dates);

  if (
    habit.current_streak !== current_streak ||
    habit.longest_streak !== longest_streak
  ) {
    habit.current_streak = current_streak;
    habit.longest_streak = longest_streak;
    await habit.save();
  }

  return {
    habit,
    pendingMissedDate,
    lastBrokenDate,
  };
}

/*
 * Convert habit to JSON response.
 */
function toHabitJSON(habit, pendingMissedDate, lastBrokenDate) {
  return {
    ...habit.toObject(),
    pendingMissedDate,
    lastBrokenDate,
  };
}

// FR-03 / FR-04: create a habit
async function createHabit(req, res) {
  try {
    const error = validateSchedule(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const {
      name,
      schedule_type,
      days_of_week,
      target_count,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Habit name is required",
      });
    }

    const habit = await Habit.create({
      user_id: req.userId,
      name: name.trim(),
      schedule_type,
      days_of_week:
        schedule_type === "specific_days" ? days_of_week : [],
      target_count:
        schedule_type === "weekly_target" ? target_count : null,
    });

    res.status(201).json({
      habit: toHabitJSON(habit, null, null),
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create habit",
      error: err.message,
    });
  }
}

// Optimized list habits
async function listHabits(req, res) {
  try {
    // Query 1: Get all habits for the logged-in user
    const habits = await Habit.find({
      user_id: req.userId,
    })
      .sort({ created_at: -1 })
      .lean();

    if (habits.length === 0) {
      return res.json({ habits: [] });
    }

    // Get all habit IDs
    const habitIds = habits.map((habit) => habit._id);

    // Query 2: Get ALL logs for these habits in one query
    const logs = await DailyLog.find({
      habit_id: { $in: habitIds },
    })
      .select("habit_id completed_date -_id")
      .lean();

    // Group logs by habit
    const logsByHabit = new Map();

    for (const log of logs) {
      const habitId = log.habit_id.toString();

      if (!logsByHabit.has(habitId)) {
        logsByHabit.set(habitId, []);
      }

      logsByHabit.get(habitId).push(log.completed_date);
    }

    // Calculate streaks without making more database queries
    const fresh = habits.map((habit) => {
      const dates = logsByHabit.get(habit._id.toString()) || [];

      const {
        current_streak,
        longest_streak,
        pendingMissedDate,
        lastBrokenDate,
      } = computeStreaks(habit, dates);

      return {
        ...habit,
        current_streak,
        longest_streak,
        pendingMissedDate,
        lastBrokenDate,
      };
    });

    res.json({
      habits: fresh,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to load habits",
      error: err.message,
    });
  }
}

// Get one habit
async function getHabit(req, res) {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    const {
      pendingMissedDate,
      lastBrokenDate,
    } = await withFreshStreak(habit);

    res.json({
      habit: toHabitJSON(
        habit,
        pendingMissedDate,
        lastBrokenDate
      ),
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to load habit",
      error: err.message,
    });
  }
}

// FR-05: update habit
async function updateHabit(req, res) {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    const merged = {
      ...habit.toObject(),
      ...req.body,
    };

    const error = validateSchedule(merged);

    if (error) {
      return res.status(400).json({
        message: error,
      });
    }

    if (req.body.name !== undefined) {
      habit.name = req.body.name.trim();
    }

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

    const {
      pendingMissedDate,
      lastBrokenDate,
    } = await withFreshStreak(habit);

    res.json({
      habit: toHabitJSON(
        habit,
        pendingMissedDate,
        lastBrokenDate
      ),
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update habit",
      error: err.message,
    });
  }
}

// FR-05: delete habit and its logs
async function deleteHabit(req, res) {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    await DailyLog.deleteMany({
      habit_id: habit._id,
    });

    res.json({
      message: "Habit deleted",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete habit",
      error: err.message,
    });
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