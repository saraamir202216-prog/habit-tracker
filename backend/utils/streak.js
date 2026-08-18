

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today as "YYYY-MM-DD" (UTC, so the whole app has one consistent clock). */
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
  // 0 = Sunday ... 6 = Saturday, matching Habit.days_of_week
  return new Date(dateStr + "T00:00:00.000Z").getUTCDay();
}

/** All "YYYY-MM-DD" strings from start to end inclusive. */
function dateRange(start, end) {
  const dates = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

/** Monday of the week containing dateStr, as "YYYY-MM-DD". */
function mondayOf(dateStr) {
  const dow = getDayOfWeek(dateStr); // 0=Sun..6=Sat
  const offsetFromMonday = dow === 0 ? 6 : dow - 1;
  return addDays(dateStr, -offsetFromMonday);
}

function isExpectedDay(habit, dateStr) {
  if (habit.schedule_type === "daily") return true;
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

  if (start > today) {
    return { current_streak: 0, longest_streak: 0, pendingMissedDate, lastBrokenDate };
  }

  for (const date of dateRange(start, today)) {
    if (!isExpectedDay(habit, date)) continue;

    const isDone = completed.has(date);

    if (date === today) {
      if (isDone) {
        running += 1;
        longest = Math.max(longest, running);
      }
      // not done yet today -> in progress, do not break
      break;
    }

    if (isDone) {
      running += 1;
      longest = Math.max(longest, running);
      continue;
    }

    // Missed expected day `date`. Its grace window runs through the
    // following calendar day.
    const graceDeadline = addDays(date, 1);
    if (today <= graceDeadline) {
      // Still within the grace window as of right now - pause here.
      // We deliberately stop walking forward: we can't yet know
      // whether this miss will be saved or will break the streak.
      pendingMissedDate = date;
      break;
    }

    // Grace window closed without the day being marked - the streak
    // breaks here.
    running = 0;
    lastBrokenDate = date;
  }

  return { current_streak: running, longest_streak: longest, pendingMissedDate, lastBrokenDate };
}

/**
 * SRS 5.3 - X-times-per-week habits. Weeks run Monday-Sunday.
 * A week is "successful" once it has >= target_count completions.
 * Past weeks that fell short break the streak; the current
 * (in-progress) week only counts toward the streak once it has
 * already hit the target - it never breaks the streak early, since
 * the week isn't over yet.
 */
function computeWeeklyTargetStreak(habit, completedDates) {
  const start = mondayOf(toDateOnly(habit.created_at));
  const today = todayStr();
  const currentWeekMonday = mondayOf(today);

  // Bucket completions by the Monday of their week.
  const perWeekCount = {};
  for (const date of completedDates) {
    const wk = mondayOf(date);
    perWeekCount[wk] = (perWeekCount[wk] || 0) + 1;
  }

  let running = 0;
  let longest = 0;

  // Every fully-elapsed past week, oldest first.
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

  // Current (still in progress) week: only allowed to extend the
  // streak, never break it, since it hasn't finished yet.
  const currentWeekCount = perWeekCount[currentWeekMonday] || 0;
  if (currentWeekCount >= habit.target_count) {
    running += 1;
    longest = Math.max(longest, running);
  }

  // No grace period for weekly-target habits - the trainer explicitly
  // confirmed a hard Monday-boundary reset with no partial carryover,
  // so these two fields are always null for this schedule type.
  return { current_streak: running, longest_streak: longest, pendingMissedDate: null, lastBrokenDate: null };
}

/**
 * Recompute current + longest streak for a habit given its full list
 * of completed_date strings ("YYYY-MM-DD").
 */
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