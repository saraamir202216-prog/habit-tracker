function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toDateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getDayOfWeek(dateStr) {
  return new Date(dateStr + "T00:00:00.000Z").getUTCDay();
}

function dateRange(start, end) {
  const dates = [];
  let cur = start;

  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }

  return dates;
}

function mondayOf(dateStr) {
  const dow = getDayOfWeek(dateStr);
  const offsetFromMonday = dow === 0 ? 6 : dow - 1;

  return addDays(dateStr, -offsetFromMonday);
}

function isExpectedDay(habit, dateStr) {
  if (habit.schedule_type === "daily") {
    return true;
  }

  if (habit.schedule_type === "specific_days") {
    return (habit.days_of_week || []).includes(getDayOfWeek(dateStr));
  }

  return false;
}

function computeDayBasedStreak(habit, completedDates) {
  const completed = new Set(completedDates);

  const start = toDateOnly(habit.created_at);
  const today = todayStr();

  let running = 0;
  let longest = 0;

  let pendingMissedDate = null;
  let lastBrokenDate = null;

  let hasProcessedExpectedDay = false;

  if (start > today) {
    return {
      current_streak: 0,
      longest_streak: 0,
      pendingMissedDate: null,
      lastBrokenDate: null,
    };
  }

  for (const date of dateRange(start, today)) {
    // Ignore days that are not part of the habit schedule.
    if (!isExpectedDay(habit, date)) {
      continue;
    }

    const isDone = completed.has(date);

    // Today should never break a streak just because it has not
    // been completed yet.
    if (date === today) {
      if (isDone) {
        running += 1;
        longest = Math.max(longest, running);
      }

      break;
    }

    // Completed scheduled day.
    if (isDone) {
      running += 1;
      longest = Math.max(longest, running);
      hasProcessedExpectedDay = true;

      continue;
    }

    // If there was already a break and the streak is currently 0,
    // do not keep creating new grace periods for every missed day.
    if (running === 0 && hasProcessedExpectedDay) {
      hasProcessedExpectedDay = true;
      continue;
    }

    hasProcessedExpectedDay = true;

    /*
     * For specific-day habits:
     *
     * If the next day is ALSO a scheduled day and it was missed,
     * the previous missed day is already part of a resolved break.
     *
     * This prevents the grace badge from incorrectly appearing
     * for the second consecutive missed scheduled day.
     */
    if (
      habit.schedule_type === "specific_days" &&
      isExpectedDay(habit, addDays(date, 1)) &&
      !completed.has(addDays(date, 1))
    ) {
      running = 0;
      lastBrokenDate = date;
      continue;
    }

    /*
     * Give one missed expected day a one-day grace period.
     */
    const graceDeadline = addDays(date, 1);

    if (today <= graceDeadline) {
      /*
       * If today is the grace deadline and today is completed,
       * the missed day is considered caught up.
       */
      if (today === graceDeadline && completed.has(today)) {
        running += 1;
        longest = Math.max(longest, running);

        pendingMissedDate = null;

        break;
      }

      pendingMissedDate = date;

      break;
    }

    /*
     * Grace period has expired.
     * The streak is broken from this missed day.
     */
    running = 0;
    lastBrokenDate = date;
  }

  return {
    current_streak: running,
    longest_streak: longest,
    pendingMissedDate,
    lastBrokenDate,
  };
}

function computeWeeklyTargetStreak(habit, completedDates) {
  const start = mondayOf(toDateOnly(habit.created_at));
  const today = todayStr();
  const currentWeekMonday = mondayOf(today);

  const perWeekCount = {};

  for (const date of completedDates) {
    const wk = mondayOf(date);

    perWeekCount[wk] = (perWeekCount[wk] || 0) + 1;
  }

  let running = 0;
  let longest = 0;

  let wk = start;

  while (wk < currentWeekMonday) {
    const count = perWeekCount[wk] || 0;

    if (count >= habit.target_count) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }

    wk = addDays(wk, 7);
  }

  /*
   * The current week is still in progress, so it should only
   * contribute to the streak if the target has already been reached.
   */
  const currentWeekCount = perWeekCount[currentWeekMonday] || 0;

  if (currentWeekCount >= habit.target_count) {
    running += 1;
    longest = Math.max(longest, running);
  }

  return {
    current_streak: running,
    longest_streak: longest,
    pendingMissedDate: null,
    lastBrokenDate: null,
  };
}

function computeStreaks(habit, completedDates) {
  if (habit.schedule_type === "weekly_target") {
    return computeWeeklyTargetStreak(habit, completedDates);
  }

  return computeDayBasedStreak(habit, completedDates);
}

module.exports = {
  todayStr,
  toDateOnly,
  addDays,
  getDayOfWeek,
  mondayOf,
  isExpectedDay,
  computeStreaks,
};