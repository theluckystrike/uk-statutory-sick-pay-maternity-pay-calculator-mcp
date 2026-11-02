// Pure rules for UK statutory pay and the minimum wage. No I/O.
// Every figure is copied from gov.uk or legislation.gov.uk pages fetched on 2026-11-02 (see DATA_SOURCES.md).

export const AS_OF = "2026-11-02";
export const REPO = "uk-statutory-sick-pay-maternity-pay-calculator-mcp";
export const MONEY_SITE = "https://ukmoneycalc.com";
export const DISCLAIMER = "Estimate from gov.uk rates, not legal or payroll advice. Check special cases with HMRC or the gov.uk calculators.";

export const SOURCES = {
  employers2627: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
  employers2526: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
  ssp: "https://www.gov.uk/statutory-sick-pay",
  employersSsp: "https://www.gov.uk/employers-sick-pay",
  sspManual: "https://www.gov.uk/guidance/statutory-sick-pay-manually-calculate-your-employees-payments",
  era2025: "https://www.legislation.gov.uk/ukpga/2025/36/section/10",
  era2025s11: "https://www.legislation.gov.uk/ukpga/2025/36/section/11",
  si2026_373: "https://www.legislation.gov.uk/uksi/2026/373/made",
  maternity: "https://www.gov.uk/maternity-pay-leave",
  employersMaternity: "https://www.gov.uk/employers-maternity-pay-leave",
  paternity: "https://www.gov.uk/paternity-pay-leave",
  adoption: "https://www.gov.uk/adoption-pay-leave",
  sharedParental: "https://www.gov.uk/shared-parental-leave-and-pay",
  nmw: "https://www.gov.uk/national-minimum-wage-rates",
} as const;

export class InputError extends Error {}

export function moreUrl(path: string): string {
  return `${MONEY_SITE}${path}?utm_source=mcp&utm_medium=${REPO}`;
}

// ---------- dates (UTC, ISO yyyy-mm-dd) ----------
const DAY = 86_400_000;
export function parseDate(s: string, field: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new InputError(`${field} must be a date like 2026-05-18 (yyyy-mm-dd).`);
  const t = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s) throw new InputError(`${field} is not a real date: ${s}.`);
  return t;
}
export const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const sundayOnOrBefore = (t: number) => t - new Date(t).getUTCDay() * DAY;
export const todayIso = () => new Date().toISOString().slice(0, 10);

// Money: work in pence. HMRC's SSP day tables round the unrounded daily rate x days UP to the next penny.
const ceilPence = (pounds: number) => Math.ceil(Math.round(pounds * 1e6) / 1e4) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Statutory Sick Pay ----------
export type SspRegime = "2025/26" | "2026/27";
interface SspYear {
  from: string; to: string; flat: number; lower_earnings_limit: number | null;
  waiting_days: number; min_piw_calendar_days: number; percent_of_awe: number | null; source: string;
}
export const SSP_YEARS: Record<SspRegime, SspYear> = {
  // 2025/26: flat £118.75, LEL £125, 3 waiting days, a PIW needs 4+ consecutive days (pre-6 April 2026 law).
  "2025/26": { from: "2025-04-06", to: "2026-04-05", flat: 118.75, lower_earnings_limit: 125, waiting_days: 3, min_piw_calendar_days: 4, percent_of_awe: null, source: SOURCES.employers2526 },
  // 2026/27: Employment Rights Act 2025 ss.10-11 in force 6 April 2026 (SI 2026/373). Lower of £123.25 or 80% of AWE, from day 1, no LEL.
  "2026/27": { from: "2026-04-06", to: "2027-04-05", flat: 123.25, lower_earnings_limit: null, waiting_days: 0, min_piw_calendar_days: 1, percent_of_awe: 0.8, source: SOURCES.employers2627 },
};

export interface SspInput {
  average_weekly_earnings: number;
  qualifying_days: number; // qualifying days per week, 1 to 7
  days_off: number; // qualifying days off sick in this period of incapacity
  start_date: string; // first full day of sickness
  calendar_days_sick?: number; // consecutive calendar days of sickness incl. non-working days (pre-6 April 2026 rule only)
}

export function sspRegimeFor(dateIso: string): { regime: SspRegime; rate_confirmed: boolean; note?: string } {
  const t = parseDate(dateIso, "start_date");
  if (t < Date.parse("2025-04-06T00:00:00Z")) throw new InputError("start_date is before 6 April 2025. This server only holds the 2025/26 and 2026/27 SSP rules.");
  if (t <= Date.parse("2026-04-05T00:00:00Z")) return { regime: "2025/26", rate_confirmed: true };
  if (t <= Date.parse("2027-04-05T00:00:00Z")) return { regime: "2026/27", rate_confirmed: true };
  return { regime: "2026/27", rate_confirmed: false, note: "The SSP rate for 2027/28 (from 6 April 2027) was not published on gov.uk when this server was built (2026-11-02). The 2026/27 rate of £123.25 is used and may be out of date." };
}

export function sspDailyAmount(weekly: number, qualifyingDays: number, days: number): number {
  if (days <= 0) return 0;
  if (days >= qualifyingDays) return weekly;
  return ceilPence((weekly * days) / qualifyingDays);
}

export function calculateSsp(i: SspInput) {
  const qd = i.qualifying_days;
  if (!Number.isInteger(qd) || qd < 1 || qd > 7) throw new InputError("qualifying_days must be a whole number from 1 to 7 (the days a week the employee normally works).");
  if (!Number.isInteger(i.days_off) || i.days_off < 0) throw new InputError("days_off must be a whole number of qualifying days, 0 or more.");
  if (!(i.average_weekly_earnings >= 0)) throw new InputError("average_weekly_earnings must be 0 or more (pounds a week, before tax).");
  const { regime, rate_confirmed, note } = sspRegimeFor(i.start_date);
  const y = SSP_YEARS[regime];
  const notes: string[] = [];
  if (note) notes.push(note);
  const awe = i.average_weekly_earnings;
  const pct = y.percent_of_awe !== null ? round2(awe * y.percent_of_awe) : null;
  const weekly = pct !== null ? Math.min(y.flat, pct) : y.flat;
  const basis = pct !== null && pct < y.flat ? "80% of average weekly earnings" : "flat weekly rate";

  let eligible = true;
  const reasons: string[] = [];
  if (y.lower_earnings_limit !== null && awe < y.lower_earnings_limit) {
    eligible = false;
    reasons.push(`Average weekly earnings of £${awe.toFixed(2)} are below the ${regime} lower earnings limit of £${y.lower_earnings_limit}. Before 6 April 2026 that meant no SSP.`);
  }
  if (regime === "2025/26") {
    const cal = i.calendar_days_sick;
    if (cal !== undefined && cal < 4) {
      eligible = false;
      reasons.push(`Before 6 April 2026 a period of incapacity for work needed at least 4 days in a row (incl. non-working days). ${cal} days is too short, unless it links to an earlier period.`);
    } else if (cal === undefined) {
      notes.push("Before 6 April 2026 SSP needed at least 4 days of sickness in a row (non-working days count). Pass calendar_days_sick to check this. It is assumed to be met.");
    }
    notes.push("Sickness that started before 6 April 2026 and continues past it falls under the transitional rules in SI 2026/373 (waiting days falling after 6 April become payable; employees on £125 to £154.05 keep £123.25 a week; those below £125 can qualify from their first sick day on or after 6 April 2026). This result applies the 2025/26 rules to the whole period and does not split it.");
  }
  if (i.days_off === 0) reasons.push("days_off is 0, so nothing is due.");

  const maxDays = 28 * qd;
  const waiting = Math.min(y.waiting_days, i.days_off);
  let payable = eligible ? Math.max(0, i.days_off - y.waiting_days) : 0;
  let capped = false;
  if (payable > maxDays - 0) { payable = maxDays; capped = true; }
  const fullWeeks = Math.floor(payable / qd);
  const extra = payable - fullWeeks * qd;
  const total = round2(fullWeeks * weekly + sspDailyAmount(weekly, qd, extra));
  if (capped) notes.push("SSP is paid for at most 28 weeks, so payable days were capped at 28 x qualifying days.");
  notes.push("Days are paid in whole weeks at the weekly rate plus remaining days at weekly rate / qualifying days x days, rounded up to the next penny (the method behind HMRC's 2026 to 2027 day tables). HMRC's manual examples round the daily rate first, which can differ by 1p.");

  return {
    tax_year_rules: regime,
    start_date: i.start_date,
    rate_confirmed,
    eligible,
    reasons,
    average_weekly_earnings: awe,
    flat_weekly_rate: y.flat,
    eighty_percent_of_awe: pct,
    weekly_rate: weekly,
    weekly_rate_basis: regime === "2025/26" ? "flat weekly rate (no 80% rule before 6 April 2026)" : basis,
    unrounded_daily_rate: Math.round((weekly / qd) * 1e4) / 1e4,
    qualifying_days_per_week: qd,
    days_off: i.days_off,
    waiting_days_unpaid: eligible ? waiting : 0,
    payable_days: payable,
    full_weeks_paid: fullWeeks,
    extra_days_paid: extra,
    total_ssp: total,
    max_weeks: 28,
    lower_earnings_limit: y.lower_earnings_limit,
    paid_from: regime === "2025/26" ? "4th qualifying day (3 waiting days)" : "1st qualifying day of sickness",
    notes,
    source: [y.source, SOURCES.sspManual, ...(regime === "2026/27" ? [SOURCES.era2025, SOURCES.si2026_373] : [SOURCES.si2026_373])].join(" ; "),
  };
}

// ---------- Family statutory pay (SMP, SPP, SAP, ShPP) ----------
interface FamilyYear { from: string; flat: number; lower_earnings_limit: number; source: string }
// SMP (and the other family payments) uprate from the first Sunday in April. gov.uk: "The SMP rate applies from 5 April 2026".
export const FAMILY_YEARS: FamilyYear[] = [
  { from: "2025-04-06", flat: 187.18, lower_earnings_limit: 125, source: SOURCES.employers2526 },
  { from: "2026-04-05", flat: 194.32, lower_earnings_limit: 129, source: SOURCES.employers2627 },
];
const LAST_PUBLISHED_TO = Date.parse("2027-04-03T00:00:00Z"); // Saturday before the first Sunday of April 2027

export function familyRateOn(t: number): { flat: number; confirmed: boolean; from: string } {
  if (t < Date.parse("2025-04-06T00:00:00Z")) throw new InputError(`The date ${iso(t)} is before 6 April 2025. This server only holds the 2025/26 and 2026/27 statutory pay rates.`);
  let y = FAMILY_YEARS[0];
  for (const f of FAMILY_YEARS) if (t >= Date.parse(`${f.from}T00:00:00Z`)) y = f;
  return { flat: y.flat, confirmed: t <= LAST_PUBLISHED_TO, from: y.from };
}

// Lower earnings limit in force for the tax year that holds the end of the qualifying week.
export function lowerEarningsLimitOn(t: number): { lel: number | null; confirmed: boolean } {
  if (t < Date.parse("2025-04-06T00:00:00Z")) return { lel: null, confirmed: false };
  if (t <= Date.parse("2026-04-05T00:00:00Z")) return { lel: 125, confirmed: true };
  if (t <= Date.parse("2027-04-05T00:00:00Z")) return { lel: 129, confirmed: true };
  return { lel: 129, confirmed: false };
}

export function qualifyingWeek(dueIso: string) {
  const due = parseDate(dueIso, "due_date");
  const ewcStart = sundayOnOrBefore(due);
  const qwStart = ewcStart - 15 * 7 * DAY;
  const qwEnd = qwStart + 6 * DAY;
  // 26 weeks of continuous employment continuing into the qualifying week: the qualifying week is week 26,
  // so employment must have started by the Saturday of the week 25 weeks before it.
  const latestStart = qwStart - 25 * 7 * DAY + 6 * DAY;
  return { due, ewcStart, qwStart, qwEnd, latestStart };
}

export const ninety = (awe: number) => ceilPence(awe * 0.9);

export interface SmpInput { average_weekly_earnings: number; due_date: string; employment_start: string; smp_start_date?: string }

export function calculateSmp(i: SmpInput) {
  if (!(i.average_weekly_earnings >= 0)) throw new InputError("average_weekly_earnings must be 0 or more (pounds a week, before tax, over the 8-week relevant period).");
  const q = qualifyingWeek(i.due_date);
  const emp = parseDate(i.employment_start, "employment_start");
  const start = i.smp_start_date ? parseDate(i.smp_start_date, "smp_start_date") : q.due;
  const earliest = q.ewcStart - 11 * 7 * DAY;
  const notes: string[] = [];
  const reasons: string[] = [];
  if (start < earliest) throw new InputError(`smp_start_date ${iso(start)} is earlier than the 11th week before the expected week of childbirth (${iso(earliest)}), the earliest maternity leave can usually start.`);
  const lel = lowerEarningsLimitOn(q.qwEnd);
  const awe = i.average_weekly_earnings;
  const serviceOk = emp <= q.latestStart;
  if (!serviceOk) reasons.push(`Employment started ${i.employment_start}. For 26 weeks' continuous employment into the qualifying week it had to start on or before ${iso(q.latestStart)}.`);
  if (lel.lel === null) throw new InputError("The qualifying week falls before 6 April 2025. This server only holds 2025/26 and 2026/27 thresholds.");
  const earningsOk = awe >= lel.lel;
  if (!earningsOk) reasons.push(`Average weekly earnings of £${awe.toFixed(2)} are below the lower earnings limit of £${lel.lel} that applies to this qualifying week. The employee may get Maternity Allowance instead.`);
  if (!lel.confirmed) notes.push("The qualifying week ends after 5 April 2027. The 2027/28 lower earnings limit was not published on gov.uk on 2026-11-02, so the 2026/27 figure of £129 is used.");
  const eligible = serviceOk && earningsOk;
  const higher = ninety(awe);
  const weeks: Array<{ week: number; starts: string; rate_basis: string; amount: number; rate_confirmed: boolean }> = [];
  let total = 0, unconfirmed = 0;
  if (eligible) {
    for (let w = 1; w <= 39; w++) {
      const ws = start + (w - 1) * 7 * DAY;
      const r = familyRateOn(ws);
      const amount = w <= 6 ? higher : Math.min(r.flat, higher);
      const basis = w <= 6 ? "90% of AWE" : amount === higher && higher < r.flat ? "90% of AWE (below flat rate)" : `flat rate £${r.flat}`;
      if (!r.confirmed) unconfirmed++;
      weeks.push({ week: w, starts: iso(ws), rate_basis: basis, amount, rate_confirmed: r.confirmed });
      total += amount;
    }
  }
  if (unconfirmed > 0) notes.push(`${unconfirmed} of the 39 weeks start on or after 4 April 2027. The 2027/28 SMP rate was not published on gov.uk on 2026-11-02, so the 2026/27 rate of £194.32 is used for them. Those totals are not confirmed.`);
  notes.push("90% of average weekly earnings is rounded up to the next penny. Each pay week runs 7 days from the SMP start date. A week that starts on or after the April uprating Sunday uses the new flat rate.");
  const first6 = round2(higher * 6);
  const rest = round2(total - first6);
  return {
    eligible,
    reasons,
    due_date: i.due_date,
    expected_week_of_childbirth_starts: iso(q.ewcStart),
    qualifying_week: { starts: iso(q.qwStart), ends: iso(q.qwEnd) },
    latest_employment_start_for_26_weeks: iso(q.latestStart),
    earliest_leave_start: iso(earliest),
    lower_earnings_limit: lel.lel,
    average_weekly_earnings: awe,
    smp_start_date: iso(start),
    weekly_90_percent: higher,
    first_6_weeks_total: eligible ? first6 : 0,
    remaining_33_weeks_total: eligible ? rest : 0,
    total_smp_39_weeks: eligible ? round2(total) : 0,
    all_rates_confirmed: unconfirmed === 0 && lel.confirmed,
    weeks,
    notes,
    source: [q.qwEnd <= Date.parse("2026-04-05T00:00:00Z") ? SOURCES.employers2526 : SOURCES.employers2627, SOURCES.maternity, SOURCES.employersMaternity].join(" ; "),
  };
}

// ---------- Eligibility across payment types ----------
export const PAYMENT_TYPES = ["statutory_sick_pay", "statutory_maternity_pay", "statutory_paternity_pay", "statutory_adoption_pay", "statutory_shared_parental_pay"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export interface EligibilityInput {
  payment_type: PaymentType;
  is_employee: boolean;
  average_weekly_earnings: number;
  employment_start?: string;
  due_date?: string; // birth: expected due date
  matched_date?: string; // adoption: date matched with the child
  sickness_start_date?: string;
  has_done_work_under_contract?: boolean;
}

export function checkEligibility(i: EligibilityInput) {
  const checks: Array<{ condition: string; met: boolean | null; detail: string }> = [];
  const add = (condition: string, met: boolean | null, detail: string) => checks.push({ condition, met, detail });
  add("Is an employee (not a worker or self-employed)", i.is_employee, i.is_employee ? "Employee." : "Statutory pay needs employee status. Self-employed people may get Maternity Allowance or Universal Credit instead.");
  let weekly: Record<string, number | string> = {};
  let source = "";
  const notes: string[] = [];
  if (i.payment_type === "statutory_sick_pay") {
    const d = i.sickness_start_date ?? todayIso();
    const { regime, rate_confirmed, note } = sspRegimeFor(d);
    const y = SSP_YEARS[regime];
    if (note) notes.push(note);
    add("Has done some work under the contract", i.has_done_work_under_contract ?? null, i.has_done_work_under_contract === undefined ? "Not given. The employee must have done some work for the employer." : i.has_done_work_under_contract ? "Yes." : "No work done yet under the contract, so no SSP.");
    if (y.lower_earnings_limit !== null) {
      add(`Average weekly earnings at least £${y.lower_earnings_limit} (2025/26 lower earnings limit)`, i.average_weekly_earnings >= y.lower_earnings_limit, `AWE £${i.average_weekly_earnings.toFixed(2)}.`);
      add("Sick at least 4 days in a row", null, "Before 6 April 2026 the first 3 qualifying days were unpaid waiting days.");
    } else {
      add("No earnings threshold", true, "The lower earnings limit for SSP was removed from 6 April 2026 (Employment Rights Act 2025 s.11). Pay is the lower of £123.25 or 80% of AWE.");
      add("Sick at least one full working day", null, "SSP is paid from the first qualifying day of sickness from 6 April 2026.");
    }
    const pct = y.percent_of_awe !== null ? round2(i.average_weekly_earnings * y.percent_of_awe) : null;
    weekly = { weekly_rate: pct !== null ? Math.min(y.flat, pct) : y.flat, flat_rate: y.flat, rate_confirmed: String(rate_confirmed) };
    source = [y.source, SOURCES.employersSsp, SOURCES.era2025s11].join(" ; ");
  } else {
    const isAdoption = i.payment_type === "statutory_adoption_pay";
    const anchorIso = isAdoption ? i.matched_date : i.due_date;
    if (!anchorIso) throw new InputError(isAdoption ? "matched_date is needed for statutory_adoption_pay (the date you were told you were matched with the child)." : "due_date is needed for this payment type.");
    if (!i.employment_start) throw new InputError("employment_start is needed to check 26 weeks of continuous employment.");
    const emp = parseDate(i.employment_start, "employment_start");
    let qwStart: number, qwEnd: number, latest: number;
    if (isAdoption) {
      const m = parseDate(anchorIso, "matched_date");
      qwStart = sundayOnOrBefore(m); qwEnd = qwStart + 6 * DAY; latest = qwStart - 25 * 7 * DAY + 6 * DAY;
    } else {
      const q = qualifyingWeek(anchorIso); qwStart = q.qwStart; qwEnd = q.qwEnd; latest = q.latestStart;
    }
    const lel = lowerEarningsLimitOn(qwEnd);
    if (lel.lel === null) throw new InputError("The qualifying week falls before 6 April 2025. This server only holds 2025/26 and 2026/27 thresholds.");
    if (!lel.confirmed) notes.push("The qualifying week ends after 5 April 2027; the 2027/28 lower earnings limit was not published on 2026-11-02, so £129 is used.");
    add(isAdoption ? "26 weeks' continuous employment by the matching week" : "26 weeks' continuous employment into the qualifying week (15th week before the due week)", emp <= latest, `Qualifying week ${iso(qwStart)} to ${iso(qwEnd)}. Employment had to start on or before ${iso(latest)}; it started ${i.employment_start}.`);
    add(`Average weekly earnings at least £${lel.lel} (lower earnings limit)`, i.average_weekly_earnings >= lel.lel, `AWE £${i.average_weekly_earnings.toFixed(2)} over the 8-week relevant period.`);
    add("Correct notice and evidence given", null, i.payment_type === "statutory_maternity_pay" ? "28 days' notice of the SMP start date and proof of pregnancy (usually MATB1)." : "Notice to the employer as gov.uk describes for this payment.");
    if (i.payment_type === "statutory_shared_parental_pay") add("Partner meets the employment and earnings test", null, "The partner must have worked at least 26 of the 66 weeks before the due week and earned at least £390 in total in 13 of those weeks. Not checked here.");
    const r = familyRateOn(Math.max(qwEnd, Date.parse("2025-04-06T00:00:00Z")));
    const ninetyPct = ninety(i.average_weekly_earnings);
    weekly = i.payment_type === "statutory_maternity_pay" || isAdoption
      ? { first_6_weeks: ninetyPct, next_33_weeks: Math.min(r.flat, ninetyPct), flat_rate: r.flat }
      : { weekly_rate: Math.min(r.flat, ninetyPct), flat_rate: r.flat, weeks: i.payment_type === "statutory_paternity_pay" ? "1 or 2 weeks" : "up to 37 weeks shared" };
    notes.push(`Flat rate shown is the one in force on ${iso(qwEnd)} (end of the qualifying week). Rates change on the first Sunday in April: £187.18 from 6 April 2025, £194.32 from 5 April 2026.`);
    source = [qwEnd <= Date.parse("2026-04-05T00:00:00Z") ? SOURCES.employers2526 : SOURCES.employers2627, { statutory_maternity_pay: SOURCES.maternity, statutory_paternity_pay: SOURCES.paternity, statutory_adoption_pay: SOURCES.adoption, statutory_shared_parental_pay: SOURCES.sharedParental }[i.payment_type]].join(" ; ");
  }
  const failed = checks.filter((c) => c.met === false);
  const unknown = checks.filter((c) => c.met === null);
  const verdict = failed.length > 0 ? "not_eligible" : unknown.length > 0 ? "likely_eligible" : "eligible";
  return { payment_type: i.payment_type, verdict, checks, weekly_amounts: weekly, notes, source };
}

// ---------- National Minimum Wage / National Living Wage ----------
interface NmwYear { from: string; to: string; adult: number; age18to20: number; under18: number; apprentice: number }
export const NMW_YEARS: NmwYear[] = [
  { from: "2024-04-01", to: "2025-03-31", adult: 11.44, age18to20: 8.6, under18: 6.4, apprentice: 6.4 },
  { from: "2025-04-01", to: "2026-03-31", adult: 12.21, age18to20: 10.0, under18: 7.55, apprentice: 7.55 },
  { from: "2026-04-01", to: "2027-03-31", adult: 12.71, age18to20: 10.85, under18: 8.0, apprentice: 8.0 },
  { from: "2027-04-01", to: "2028-03-31", adult: 13.21, age18to20: 11.27, under18: 8.31, apprentice: 8.31 },
];

export interface NmwInput { date?: string; age?: number; apprentice?: boolean; apprentice_first_year?: boolean; hours_per_week?: number }

export function getMinimumWage(i: NmwInput) {
  const d = i.date ?? todayIso();
  const t = parseDate(d, "date");
  const y = NMW_YEARS.find((r) => t >= Date.parse(`${r.from}T00:00:00Z`) && t <= Date.parse(`${r.to}T00:00:00Z`));
  if (!y) throw new InputError(`No rates held for ${d}. This server covers 1 April 2024 to 31 March 2028 (April 2027 rates are published on gov.uk).`);
  const table = [
    { band: "21 and over (National Living Wage)", hourly: y.adult },
    { band: "18 to 20", hourly: y.age18to20 },
    { band: "Under 18 (above school leaving age)", hourly: y.under18 },
    { band: "Apprentice (under 19, or 19+ in first year)", hourly: y.apprentice },
  ];
  let applicable: { band: string; hourly: number } | null = null;
  let explanation = "";
  if (i.age !== undefined) {
    if (!Number.isInteger(i.age) || i.age < 0 || i.age > 120) throw new InputError("age must be a whole number of years.");
    if (i.age < 16) {
      explanation = "Under school leaving age (16), so the minimum wage does not apply.";
    } else if (i.apprentice && (i.age < 19 || i.apprentice_first_year !== false)) {
      applicable = table[3];
      explanation = i.age < 19 ? "Apprentice aged under 19: apprentice rate." : i.apprentice_first_year === undefined
        ? "Apprentice aged 19+: apprentice rate in the first year of the apprenticeship (assumed here; set apprentice_first_year false if it is completed, then the age rate applies)."
        : "Apprentice aged 19+ in the first year: apprentice rate.";
    } else if (i.age >= 21) { applicable = table[0]; explanation = "Aged 21 or over: National Living Wage."; }
    else if (i.age >= 18) { applicable = table[1]; explanation = "Aged 18 to 20."; }
    else { applicable = table[2]; explanation = "Aged under 18 but above school leaving age."; }
  }
  const hours = i.hours_per_week;
  const pay = applicable && hours ? { weekly: round2(applicable.hourly * hours), annual_52_weeks: round2(applicable.hourly * hours * 52) } : null;
  const next = NMW_YEARS.find((r) => Date.parse(`${r.from}T00:00:00Z`) > t) ?? null;
  return { date: d, period: `${y.from} to ${y.to}`, rates: table, applicable, explanation, pay_at_rate: pay, next_change: next ? { from: next.from, adult: next.adult, age18to20: next.age18to20, under18: next.under18, apprentice: next.apprentice } : null, source: `${SOURCES.nmw} ; ${SOURCES.employers2627}` };
}
