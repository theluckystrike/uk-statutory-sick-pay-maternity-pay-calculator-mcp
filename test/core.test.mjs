// Fixtures: expected values come from gov.uk worked examples and day tables (cited) or
// hand-checked arithmetic on the gov.uk 2025/26 and 2026/27 rates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateSsp, calculateSmp, checkEligibility, getMinimumWage, ninety, InputError } from "../dist/core.js";

const ssp = (awe, qd, days, start = "2026-06-01", extra = {}) => calculateSsp({ average_weekly_earnings: awe, qualifying_days: qd, days_off: days, start_date: start, ...extra });

test("F1 gov.uk SSP manual Example 1: AWE £185, 5 qualifying days, 3 days sick -> £73.95", () => {
  const r = ssp(185, 5, 3);
  assert.equal(r.weekly_rate, 123.25);
  assert.equal(r.total_ssp, 73.95);
  assert.equal(r.waiting_days_unpaid, 0);
});

test("F2 gov.uk 2026/27 day table: 6 qualifying days, 4 days -> £82.17", () => {
  assert.equal(ssp(185, 6, 4).total_ssp, 82.17);
});

test("F3 gov.uk SSP manual Example 3: AWE £145 -> 80% = £116, 4 qualifying days, 2 days -> £58", () => {
  const r = ssp(145, 4, 2);
  assert.equal(r.weekly_rate, 116);
  assert.equal(r.total_ssp, 58);
});

test("F4 gov.uk SSP manual Example 4: AWE £145, 5 qualifying days, 3 days -> £69.60", () => {
  assert.equal(ssp(145, 5, 3).total_ssp, 69.6);
});

test("F5 gov.uk 2026/27 day table: 7 qualifying days, 6 days -> £105.65; 1 day -> £17.61", () => {
  assert.equal(ssp(1000, 7, 6).total_ssp, 105.65);
  assert.equal(ssp(1000, 7, 1).total_ssp, 17.61);
});

test("F6 from 6 April 2026 no lower earnings limit: AWE £100 -> £80 a week, 10 days on 5-day week -> £160", () => {
  const r = ssp(100, 5, 10);
  assert.equal(r.eligible, true);
  assert.equal(r.weekly_rate, 80);
  assert.equal(r.total_ssp, 160);
});

test("F7 2025/26 rules: AWE £100 below £125 LEL -> no SSP", () => {
  const r = ssp(100, 5, 10, "2026-01-05");
  assert.equal(r.eligible, false);
  assert.equal(r.total_ssp, 0);
});

test("F8 2025/26 rules: 5 days off on 5-day week -> 3 waiting days, 2 x £118.75/5 = £47.50", () => {
  const r = ssp(300, 5, 5, "2026-01-05");
  assert.equal(r.waiting_days_unpaid, 3);
  assert.equal(r.total_ssp, 47.5);
  assert.equal(ssp(300, 5, 3, "2026-01-05", { calendar_days_sick: 3 }).eligible, false);
});

test("F9 28-week cap: 200 days off on a 5-day week -> 140 days, 28 x £123.25 = £3,451", () => {
  const r = ssp(1000, 5, 200);
  assert.equal(r.payable_days, 140);
  assert.equal(r.total_ssp, 3451);
});

test("F10 SSP after 5 April 2027 is flagged unconfirmed; before 6 April 2025 is refused", () => {
  assert.equal(ssp(500, 5, 5, "2027-04-06").rate_confirmed, false);
  assert.throws(() => ssp(500, 5, 5, "2025-01-01"), InputError);
});

test("F11 SMP due 2026-10-15, AWE £500: qualifying week 2026-06-28 to 2026-07-04, latest start 2026-01-10, total 6 x £450 + 33 x £194.32 = £9,112.56", () => {
  const r = calculateSmp({ average_weekly_earnings: 500, due_date: "2026-10-15", employment_start: "2025-06-01" });
  assert.equal(r.expected_week_of_childbirth_starts, "2026-10-11");
  assert.deepEqual(r.qualifying_week, { starts: "2026-06-28", ends: "2026-07-04" });
  assert.equal(r.latest_employment_start_for_26_weeks, "2026-01-10");
  assert.equal(r.lower_earnings_limit, 129);
  assert.equal(r.total_smp_39_weeks, 9112.56);
  assert.equal(r.weeks.filter((w) => !w.rate_confirmed).length, 14);
  assert.equal(r.all_rates_confirmed, false);
});

test("F12 SMP AWE £200: 90% = £180 below flat rate for all 39 weeks -> £7,020", () => {
  const r = calculateSmp({ average_weekly_earnings: 200, due_date: "2026-06-15", employment_start: "2024-01-01" });
  assert.equal(r.total_smp_39_weeks, 7020);
  assert.equal(r.all_rates_confirmed, true);
});

test("F13 SMP across the April 2026 uprating: start 2026-02-15, AWE £1,000 -> 6 x £900 + £187.18 + 32 x £194.32 = £11,805.42", () => {
  const r = calculateSmp({ average_weekly_earnings: 1000, due_date: "2026-02-15", employment_start: "2024-01-01" });
  assert.equal(r.weeks[6].amount, 187.18);
  assert.equal(r.weeks[7].starts, "2026-04-05");
  assert.equal(r.weeks[7].amount, 194.32);
  assert.equal(r.total_smp_39_weeks, 11805.42);
  assert.equal(r.lower_earnings_limit, 125);
});

test("F14 SMP lower earnings limit: AWE £127 fails £129 (2026/27 week) but passes £125 (2025/26 week)", () => {
  assert.equal(calculateSmp({ average_weekly_earnings: 127, due_date: "2026-10-15", employment_start: "2024-01-01" }).eligible, false);
  assert.equal(calculateSmp({ average_weekly_earnings: 127, due_date: "2026-02-15", employment_start: "2024-01-01" }).eligible, true);
});

test("F15 SMP 26 weeks' service: start 2026-01-10 qualifies for due 2026-10-15, 2026-01-11 does not", () => {
  assert.equal(calculateSmp({ average_weekly_earnings: 500, due_date: "2026-10-15", employment_start: "2026-01-10" }).eligible, true);
  assert.equal(calculateSmp({ average_weekly_earnings: 500, due_date: "2026-10-15", employment_start: "2026-01-11" }).eligible, false);
});

test("F16 90% of AWE rounds up to the next penny: £333.33 -> £300.00, £185 -> £166.50", () => {
  assert.equal(ninety(333.33), 300);
  assert.equal(ninety(185), 166.5);
});

test("F17 gov.uk NMW: April 2026 rates by age, apprentice rules, April 2027 rates", () => {
  assert.equal(getMinimumWage({ date: "2026-04-01", age: 21 }).applicable.hourly, 12.71);
  assert.equal(getMinimumWage({ date: "2026-03-31", age: 21 }).applicable.hourly, 12.21);
  assert.equal(getMinimumWage({ date: "2026-06-01", age: 20 }).applicable.hourly, 10.85);
  assert.equal(getMinimumWage({ date: "2026-06-01", age: 17 }).applicable.hourly, 8);
  assert.equal(getMinimumWage({ date: "2026-06-01", age: 21, apprentice: true, apprentice_first_year: true }).applicable.hourly, 8);
  assert.equal(getMinimumWage({ date: "2026-06-01", age: 21, apprentice: true, apprentice_first_year: false }).applicable.hourly, 12.71);
  assert.equal(getMinimumWage({ date: "2027-04-01", age: 30 }).applicable.hourly, 13.21);
  assert.equal(getMinimumWage({ date: "2026-06-01", age: 15 }).applicable, null);
});

test("F18 NMW pay at rate: £12.71 x 37.5 hours -> £476.63 a week (476.625 rounds half up)", () => {
  const r = getMinimumWage({ date: "2026-06-01", age: 30, hours_per_week: 37.5 });
  assert.equal(r.pay_at_rate.weekly, 476.63);
});

test("F19 eligibility: SSP from April 2026 with AWE £50 -> no failed condition, £40 a week", () => {
  const r = checkEligibility({ payment_type: "statutory_sick_pay", is_employee: true, average_weekly_earnings: 50, sickness_start_date: "2026-06-01", has_done_work_under_contract: true });
  assert.equal(r.verdict, "likely_eligible");
  assert.equal(r.checks.filter((c) => c.met === false).length, 0);
  assert.equal(r.weekly_amounts.weekly_rate, 40);
});

test("F20 eligibility: paternity pay, due 2026-10-15, AWE £300 -> £194.32 a week; self-employed fails", () => {
  const ok = checkEligibility({ payment_type: "statutory_paternity_pay", is_employee: true, average_weekly_earnings: 300, employment_start: "2025-01-01", due_date: "2026-10-15" });
  assert.notEqual(ok.verdict, "not_eligible");
  assert.equal(ok.weekly_amounts.weekly_rate, 194.32);
  const no = checkEligibility({ payment_type: "statutory_maternity_pay", is_employee: false, average_weekly_earnings: 300, employment_start: "2025-01-01", due_date: "2026-10-15" });
  assert.equal(no.verdict, "not_eligible");
});
