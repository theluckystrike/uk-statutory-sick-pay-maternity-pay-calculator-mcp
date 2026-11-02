// One tool registry shared by the stdio and Cloudflare Worker entries.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AS_OF, DISCLAIMER, InputError, PAYMENT_TYPES, calculateSmp, calculateSsp, checkEligibility, getMinimumWage, moreUrl } from "./core.js";
export const SERVER_NAME = "uk-statutory-sick-pay-maternity-pay-calculator-mcp";
export const SERVER_VERSION = "1.0.0";
const gbp = (n) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const date = (field) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe(field);
const awe = z.number().min(0).max(1_000_000).describe("Average weekly earnings in pounds, before tax, over the 8-week relevant period.");
function reply(summary, data, morePath) {
    const body = { ...data, summary, as_of: AS_OF, more: moreUrl(morePath), disclaimer: DISCLAIMER };
    return {
        content: [
            { type: "text", text: `${summary}\n\n${DISCLAIMER}` },
            { type: "text", text: JSON.stringify(body, null, 2) },
        ],
        structuredContent: body,
    };
}
function run(fn) {
    try {
        return fn();
    }
    catch (e) {
        const msg = e instanceof InputError ? e.message : `Unexpected error: ${e.message}`;
        return { isError: true, content: [{ type: "text", text: msg }] };
    }
}
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export function registerTools(server) {
    server.registerTool("calculate_statutory_sick_pay", {
        title: "UK Statutory Sick Pay",
        description: "Works out UK Statutory Sick Pay (SSP) for a period of sickness. Knows the Employment Rights Act 2025 changes in force from 6 April 2026: SSP is paid from the first qualifying day (no 3 waiting days), the lower earnings limit is gone, and the weekly rate is the lower of £123.25 or 80% of average weekly earnings. For sickness starting 6 April 2025 to 5 April 2026 it applies the old rules (£118.75 flat, £125 lower earnings limit, 3 waiting days, 4-day period of incapacity) and flags the SI 2026/373 transitional rules. Uses HMRC's unrounded daily rates and 28-week cap. Rates fetched from gov.uk and legislation.gov.uk on 2026-11-02.",
        inputSchema: {
            average_weekly_earnings: awe,
            qualifying_days: z.number().int().min(1).max(7).describe("Qualifying days a week: the days the employee normally works, 1 to 7."),
            days_off: z.number().int().min(0).max(2000).describe("Number of qualifying days off sick in this period of incapacity."),
            start_date: date("First full day of sickness, yyyy-mm-dd. Picks the rules: before or from 6 April 2026."),
            calendar_days_sick: z.number().int().min(1).max(5000).optional().describe("Optional. Consecutive calendar days of sickness incl. non-working days. Only used for the pre-6 April 2026 rule that a period must be 4+ days."),
        },
        annotations: { ...RO, title: "UK Statutory Sick Pay" },
    }, async (a) => run(() => {
        const r = calculateSsp(a);
        const s = r.eligible
            ? `Under the ${r.tax_year_rules} rules SSP is ${gbp(r.weekly_rate)} a week (${r.weekly_rate_basis}). For ${r.days_off} qualifying days off on a ${r.qualifying_days_per_week}-day week, ${r.payable_days} days are payable${r.waiting_days_unpaid ? ` after ${r.waiting_days_unpaid} unpaid waiting days` : " from day one"}: total ${gbp(r.total_ssp)}.${r.rate_confirmed ? "" : " The rate for this date is not yet published, see notes."}`
            : `No SSP under the ${r.tax_year_rules} rules. ${r.reasons.join(" ")}`;
        return reply(s, r, "/calculators/take-home-pay/");
    }));
    server.registerTool("calculate_statutory_maternity_pay", {
        title: "UK Statutory Maternity Pay",
        description: "Works out UK Statutory Maternity Pay (SMP) week by week for 39 weeks: 90% of average weekly earnings for 6 weeks, then the lower of the flat rate or 90% for 33 weeks. Flat rate £187.18 from 6 April 2025 and £194.32 from 5 April 2026, switching for pay weeks that start after the April uprating. Finds the expected week of childbirth, the qualifying week (15th week before), the latest employment start date for 26 weeks' service and the lower earnings limit for that week (£125 in 2025/26, £129 in 2026/27). Same structure applies to Statutory Adoption Pay. Figures from gov.uk, fetched 2026-11-02.",
        inputSchema: {
            average_weekly_earnings: awe,
            due_date: date("Expected due date of the baby, yyyy-mm-dd."),
            employment_start: date("Date the employee started with this employer, yyyy-mm-dd."),
            smp_start_date: date("Optional. Date SMP starts, yyyy-mm-dd. Default is the due date.").optional(),
        },
        annotations: { ...RO, title: "UK Statutory Maternity Pay" },
    }, async (a) => run(() => {
        const r = calculateSmp(a);
        const s = r.eligible
            ? `SMP from ${r.smp_start_date}: ${gbp(r.weekly_90_percent)} a week for the first 6 weeks (${gbp(r.first_6_weeks_total)}), then ${gbp(r.remaining_33_weeks_total)} over the next 33 weeks. Total ${gbp(r.total_smp_39_weeks)} before tax and NI. Qualifying week ${r.qualifying_week.starts} to ${r.qualifying_week.ends}; lower earnings limit ${gbp(r.lower_earnings_limit ?? 0)}.${r.all_rates_confirmed ? "" : " Some weeks use a rate not yet published, see notes."}`
            : `Not eligible for SMP. ${r.reasons.join(" ")}`;
        return reply(s, r, "/calculators/maternity-pay/");
    }));
    server.registerTool("get_minimum_wage_rates", {
        title: "UK National Minimum Wage and National Living Wage",
        description: "Returns the UK National Living Wage and National Minimum Wage hourly rates in force on a date, by age band and apprentice rate, and the rate that applies to a given age. Holds April 2024, April 2025, April 2026 (£12.71 for 21 and over, £10.85 for 18 to 20, £8 under 18 and apprentices) and the published April 2027 rates (£13.21, £11.27, £8.31). Can also give weekly and annual pay at the rate for given hours. Rates fetched from gov.uk on 2026-11-02.",
        inputSchema: {
            date: date("Date to check, yyyy-mm-dd. Default today.").optional(),
            age: z.number().int().min(0).max(120).optional().describe("Worker's age in whole years."),
            apprentice: z.boolean().optional().describe("True if the worker is an apprentice."),
            apprentice_first_year: z.boolean().optional().describe("For apprentices aged 19+: true if in the first year of the apprenticeship (apprentice rate), false if completed (age rate)."),
            hours_per_week: z.number().min(0).max(168).optional().describe("Optional hours a week, to show weekly and annual pay at the rate."),
        },
        annotations: { ...RO, title: "UK minimum wage rates" },
    }, async (a) => run(() => {
        const r = getMinimumWage(a);
        const app = r.applicable ? ` For this worker: ${gbp(r.applicable.hourly)} an hour (${r.explanation})` : r.explanation ? ` ${r.explanation}` : "";
        const pay = r.pay_at_rate ? ` At ${a.hours_per_week} hours a week that is ${gbp(r.pay_at_rate.weekly)} a week, ${gbp(r.pay_at_rate.annual_52_weeks)} a year.` : "";
        const nx = r.next_change ? ` Next change ${r.next_change.from}: ${gbp(r.next_change.adult)} for 21 and over.` : "";
        const s = `UK minimum wage on ${r.date} (${r.period}): ${r.rates.map((x) => `${x.band} ${gbp(x.hourly)}`).join("; ")}.${app}${pay}${nx}`;
        return reply(s, r, "/calculators/pro-rata-salary/");
    }));
    server.registerTool("check_eligibility", {
        title: "Check UK statutory pay eligibility",
        description: "Checks the qualifying conditions for UK Statutory Sick Pay, Maternity, Paternity, Adoption or Shared Parental Pay and returns each condition as met, not met or not checkable, plus the weekly amounts. Knows that from 6 April 2026 SSP has no earnings threshold and no waiting days, and applies the 26 weeks' continuous employment test into the qualifying week (15th week before the due week, or the matching week for adoption) and the lower earnings limit (£125 in 2025/26, £129 in 2026/27). Data from gov.uk and legislation.gov.uk, fetched 2026-11-02.",
        inputSchema: {
            payment_type: z.enum(PAYMENT_TYPES).describe("Which statutory payment to check."),
            is_employee: z.boolean().describe("True if the person is an employee with an employment contract."),
            average_weekly_earnings: awe,
            employment_start: date("Date employment with this employer started, yyyy-mm-dd. Needed for family payments.").optional(),
            due_date: date("Expected due date of the baby, yyyy-mm-dd (maternity, paternity, shared parental).").optional(),
            matched_date: date("Date matched with the child, yyyy-mm-dd (adoption).").optional(),
            sickness_start_date: date("First day of sickness, yyyy-mm-dd (sick pay). Default today.").optional(),
            has_done_work_under_contract: z.boolean().optional().describe("Sick pay: has the employee done some work under the contract?"),
        },
        annotations: { ...RO, title: "Check UK statutory pay eligibility" },
    }, async (a) => run(() => {
        const r = checkEligibility(a);
        const failed = r.checks.filter((c) => c.met === false).map((c) => c.condition);
        const open = r.checks.filter((c) => c.met === null).map((c) => c.condition);
        const amt = Object.entries(r.weekly_amounts).filter(([, v]) => typeof v === "number").map(([k, v]) => `${k.replace(/_/g, " ")} ${gbp(v)}`).join(", ");
        const s = `${r.payment_type.replace(/_/g, " ")}: ${r.verdict.replace(/_/g, " ")}.${failed.length ? ` Not met: ${failed.join("; ")}.` : ""}${open.length ? ` Still to confirm: ${open.join("; ")}.` : ""} Weekly amounts: ${amt}.`;
        return reply(s, r, r.payment_type === "statutory_sick_pay" ? "/calculators/take-home-pay/" : "/calculators/maternity-pay/");
    }));
}
export function createServer() {
    const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
    registerTools(server);
    return server;
}
