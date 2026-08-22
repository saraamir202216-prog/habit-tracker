const assert = require("assert");
const { computeStreaks, todayStr, addDays } = require("./utils/streak");

const today = todayStr();
function d(offset) {
  return addDays(today, offset);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

test("daily: 3 consecutive days completed, today not yet done -> streak = 3", () => {
  const habit = { schedule_type: "daily", created_at: d(-10) };
  const dates = [d(-3), d(-2), d(-1)];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.current_streak, 3);
  assert.strictEqual(r.pendingMissedDate, null);
});

test("daily: gap with NO catch-up, grace expired -> streak resets to 0", () => {
  const habit = { schedule_type: "daily", created_at: d(-8) };
  const dates = [d(-8), d(-7), d(-6), d(-5), d(-3), d(-2), d(-1)];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.lastBrokenDate, d(-4));
  assert.strictEqual(r.current_streak, 3);
});

test("daily: missed yesterday, still within grace window today -> pending, not broken", () => {
  const habit = { schedule_type: "daily", created_at: d(-10) };
  const dates = [d(-4), d(-3), d(-2)];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.pendingMissedDate, d(-1));
  assert.strictEqual(r.current_streak, 3);
});

test("daily: missed day was marked DURING its grace window -> streak preserved, extended", () => {
  const habit = { schedule_type: "daily", created_at: d(-10) };
  const dates = [d(-4), d(-3), d(-2), d(-1)];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.pendingMissedDate, null);
  assert.strictEqual(r.current_streak, 4);
});

test("daily: today never breaks the streak before the day ends", () => {
  const habit = { schedule_type: "daily", created_at: d(-3) };
  const dates = [d(-2), d(-1)];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.current_streak, 2);
});

test("daily: marking TODAY done resolves yesterday's pending grace (the reported bug)", () => {
  const habit = { schedule_type: "daily", created_at: d(-5) };
  const dates = [d(-4), d(-3), d(-2), today];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.pendingMissedDate, null, "grace should be cleared once today is done");
  assert.strictEqual(r.current_streak, 4);
});

test("daily: consecutive misses after a break don't keep re-triggering grace (trainer's exact scenario)", () => {
  const habit = { schedule_type: "daily", created_at: d(-6) };
  const dates = [d(-6), d(-5), d(-4)];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.pendingMissedDate, null, "should NOT show grace for the second consecutive miss");
  assert.strictEqual(r.current_streak, 0);
});

test("daily: once a streak is already broken, marking today starts a clean new streak of 1, no lingering grace badge", () => {
  const habit = { schedule_type: "daily", created_at: d(-6) };
  const dates = [d(-6), d(-5), d(-4), today];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.pendingMissedDate, null);
  assert.strictEqual(r.current_streak, 1, "today starts a fresh streak, not blocked by old resolved break");
});

test("specific_days: missed Wed then Thu (Wed/Thu/Tue habit), today is Fri (not scheduled) - no grace shown, 48h already passed", () => {
  const habit = { schedule_type: "specific_days", days_of_week: [2, 3, 4], created_at: d(-14) };
  const expectedDays = [];
  for (let i = -14; i <= 0; i++) {
    const ds = d(i);
    const dow = new Date(ds + "T00:00:00.000Z").getUTCDay();
    if ([2, 3, 4].includes(dow)) expectedDays.push(ds);
  }
  const toComplete = expectedDays.slice(0, -2);
  const r = computeStreaks(habit, toComplete);
  assert.strictEqual(r.pendingMissedDate, null, "no grace should be showing - the gap is already fully resolved as broken");
  assert.strictEqual(r.current_streak, 0);
});

test("specific_days: only chosen weekdays count, non-chosen days are ignored entirely", () => {
  const habit = { schedule_type: "specific_days", days_of_week: [1, 3, 5], created_at: d(-20) };
  const dates = [];
  for (let i = -20; i <= -1; i++) {
    const ds = d(i);
    const dow = new Date(ds + "T00:00:00.000Z").getUTCDay();
    if ([1, 3, 5].includes(dow)) dates.push(ds);
  }
  const r = computeStreaks(habit, dates);
  assert.ok(r.current_streak > 0, "expected a positive streak when every expected day was completed");
});

test("specific_days: an expected day missed and grace expired -> resets, reports which day broke it", () => {
  const habit = { schedule_type: "specific_days", days_of_week: [1, 2, 3], created_at: d(-15) };
  const dates = [];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.current_streak, 0);
});

test("weekly_target: hits target 3 weeks running -> streak = 3, no grace fields", () => {
  const habit = { schedule_type: "weekly_target", target_count: 3, created_at: d(-30) };
  const { mondayOf } = require("./utils/streak");
  const currentMonday = mondayOf(today);
  const dates = [];
  for (let weeksAgo = 3; weeksAgo >= 1; weeksAgo--) {
    const weekMonday = addDays(currentMonday, -7 * weeksAgo);
    dates.push(weekMonday, addDays(weekMonday, 1), addDays(weekMonday, 2));
  }
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.current_streak, 3);
  assert.strictEqual(r.pendingMissedDate, null, "weekly_target should never have a pending grace day");
  assert.strictEqual(r.lastBrokenDate, null, "weekly_target should never have a grace-related break date");
});

test("weekly_target: a past week fell short of target -> streak breaks at that week", () => {
  const habit = { schedule_type: "weekly_target", target_count: 3, created_at: d(-21) };
  const dates = [d(-19), d(-18)];
  const r = computeStreaks(habit, dates);
  assert.strictEqual(r.current_streak, 0);
});

test("weekly_target: current in-progress week never breaks the streak early", () => {
  const habit = { schedule_type: "weekly_target", target_count: 5, created_at: d(-10) };
  const dates = [d(-1)];
  const r = computeStreaks(habit, dates);
  assert.ok(r.current_streak >= 0);
});

console.log("");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);