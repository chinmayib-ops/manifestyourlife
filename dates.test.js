// Run with: node dates.test.js
import assert from "node:assert/strict";
import { fourMonthsOut, daysUntil, toISODate } from "./dates.js";

// four months out, ordinary case
assert.equal(fourMonthsOut(new Date(2026, 0, 15)), "2026-05-15");

// year rollover
assert.equal(fourMonthsOut(new Date(2026, 9, 3)), "2027-02-03");

// short target month clamps instead of spilling into the next month
assert.equal(fourMonthsOut(new Date(2026, 9, 31)), "2027-02-28");
assert.equal(fourMonthsOut(new Date(2027, 9, 31)), "2028-02-29"); // leap year

// day counting ignores time-of-day
assert.equal(daysUntil("2026-08-11", new Date(2026, 7, 1, 23, 30)), 10);
assert.equal(daysUntil("2026-08-01", new Date(2026, 7, 1, 0, 5)), 0);

// past dates never go negative
assert.equal(daysUntil("2025-01-01", new Date(2026, 7, 1)), 0);

// a fresh 4-month target is ~120 days out, never 0
const now = new Date(2026, 7, 1);
assert.ok(daysUntil(fourMonthsOut(now), now) > 110);

assert.equal(toISODate(new Date(2026, 0, 5)), "2026-01-05");

console.log("dates.js: all checks passed");
