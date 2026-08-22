/**
 * Streak calculation - the "hard part" described in SRS Section 5 and
 * ERD Section 2. Everything here works with plain "YYYY-MM-DD" strings
 * so we never have to fight timezones. All streaks are recomputed from
 * the FULL log history every time a log is added/removed. That is
 * simpler and safer than trying to patch a running counter, and it
 * guarantees FR-10 for free: the longest streak is just the maximum
 * ever seen while replaying history, so it can never accidentally
 * decrease.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

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
      break;
    }

    if (isDone) {
      running += 1;
      longest = Math.max(longest, running);
      continue;
    }

    if (running === 0) {
      continue;
    }

    const graceDeadline = addDays(date, 1);
    if (today <= graceDeadline) {
      if (today === graceDeadline && completed.has(today)) {
        running += 1;
        longest = Math.max(longest, running);
        pendingMissedDate = null;
        break;
      }

      pendingMissedDate = date;
      break;
    }

    running = 0;
    lastBrokenDate = date;
  }

  return { current_streak: running, longest_streak: longest, pendingMissedDate, lastBrokenDate };
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

  const currentWeekCount = perWeekCount[currentWeekMonday] || 0;
  if (currentWeekCount >= habit.target_count) {
    running += 1;
    longest = Math.max(longest, running);
  }

  return { current_streak: running, longest_streak: longest, pendingMissedDate: null, lastBrokenDate: null };
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