const mongoose = require("mongoose");

// ERD Section 2: Approach A - schedule_type field + extra fields used
// only for certain types.
// ERD Section 3: habits(id, user_id, name, schedule_type, days_of_week,
// target_count)
//
// We also cache current_streak / longest_streak on the habit document
// so the dashboard (FR-11) can render instantly without recalculating
// on every page load. Both fields are recomputed and overwritten by
// utils/streak.js any time a log is added or removed, so they are
// never a second source of truth - just a cache of the calculation.
const habitSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Habit name is required"],
      trim: true,
    },
    schedule_type: {
      type: String,
      enum: ["daily", "specific_days", "weekly_target"],
      required: true,
    },
    // Only used when schedule_type === "specific_days".
    // Stored as numbers 0-6 (0 = Sunday ... 6 = Saturday) to match
    // JS Date#getDay(), which the streak calculator relies on.
    days_of_week: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: "days_of_week values must be between 0 (Sun) and 6 (Sat)",
      },
    },
    // Only used when schedule_type === "weekly_target".
    target_count: {
      type: Number,
      default: null,
      min: 1,
    },
    current_streak: {
      type: Number,
      default: 0,
    },
    longest_streak: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Habit", habitSchema);
