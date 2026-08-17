const mongoose = require("mongoose");

// ERD: daily_logs(id, habit_id, user_id, completed_date, created_at)
// One row = "this habit was completed on this date". Un-marking a day
// (FR-07) simply deletes the row rather than storing a boolean, which
// keeps the streak calculator simple: a date either has a log or it
// doesn't.
const dailyLogSchema = new mongoose.Schema(
  {
    habit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Stored as "YYYY-MM-DD" (not a full Date/timestamp) so that day
    // comparisons never get tripped up by timezones or time-of-day.
    completed_date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

// A habit can only be completed once per date - marking an already
// completed day again should just be a no-op, not a duplicate row.
dailyLogSchema.index({ habit_id: 1, completed_date: 1 }, { unique: true });

module.exports = mongoose.model("DailyLog", dailyLogSchema);
