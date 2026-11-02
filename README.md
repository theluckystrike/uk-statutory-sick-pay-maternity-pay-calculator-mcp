# uk-statutory-sick-pay-maternity-pay-calculator-mcp

An MCP server for UK Statutory Sick Pay under the rules in force from 6 April 2026, Statutory Maternity, Paternity, Adoption and Shared Parental Pay for 2025/26 and 2026/27, and the National Living Wage and National Minimum Wage rates, using gov.uk figures.

Hosted endpoint, no sign-in and no token:

```
https://uk-statutory-sick-pay-maternity-pay-calculator-mcp.lipmichal.workers.dev/mcp
```

## Tools

| Tool | What it does |
|---|---|
| `calculate_statutory_sick_pay` | SSP for a period of sickness: weekly rate, waiting days, payable days and total, under the 2026/27 rules (from day one, no earnings limit, lower of £123.25 or 80% of earnings) or the 2025/26 rules. |
| `calculate_statutory_maternity_pay` | SMP week by week for 39 weeks, with the expected week of childbirth, qualifying week, latest employment start date for 26 weeks' service and the lower earnings limit. |
| `get_minimum_wage_rates` | National Living Wage and National Minimum Wage on a date by age band and apprentice rate, from April 2024 to April 2027, with pay for given hours. |
| `check_eligibility` | Qualifying conditions for sick, maternity, paternity, adoption or shared parental pay, each marked met, not met or to confirm, with weekly amounts. |

Every result has structured JSON, a plain-English summary, `as_of`, `source` (the gov.uk or legislation.gov.uk page) and `more` (a calculator page on ukmoneycalc.com).

## What it knows that your model does not

- From 6 April 2026 the Employment Rights Act 2025 (ss.10 and 11, commenced by SI 2026/373) removed the 3 SSP waiting days and the lower earnings limit. SSP is now the lower of £123.25 a week or 80% of average weekly earnings, paid from the first qualifying day.
- Before 6 April 2026 SSP was £118.75 flat, needed earnings of at least £125 a week and 4 days of sickness in a row, and the first 3 qualifying days were unpaid.
- HMRC's 2026/27 SSP day tables round the unrounded daily rate times days up to the next penny, so 4 days on a 6-day week is £82.17.
- The 2026/27 family pay flat rate is £194.32 (2025/26: £187.18). The SMP rate changed on Sunday 5 April 2026, so a maternity pay period that crosses April uses both.
- The lower earnings limit for maternity, paternity, adoption and shared parental pay is £129 a week in 2026/27 (£125 in 2025/26).
- The National Living Wage is £12.71 an hour from 1 April 2026, with £10.85 for 18 to 20 and £8 for under 18s and apprentices. The April 2027 rates are already published: £13.21, £11.27 and £8.31.

## Install

### Claude.ai custom connector or ChatGPT developer mode

Add a custom connector and paste the URL. No token is needed.

```
https://uk-statutory-sick-pay-maternity-pay-calculator-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http uk-statutory-pay https://uk-statutory-sick-pay-maternity-pay-calculator-mcp.lipmichal.workers.dev/mcp
```

Or run it locally:

```
claude mcp add uk-statutory-pay -- npx -y github:theluckystrike/uk-statutory-sick-pay-maternity-pay-calculator-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uk-statutory-pay": {
      "command": "npx",
      "args": ["-y", "github:theluckystrike/uk-statutory-sick-pay-maternity-pay-calculator-mcp"]
    }
  }
}
```

### Cursor

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "uk-statutory-pay": {
      "url": "https://uk-statutory-sick-pay-maternity-pay-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

### VS Code

Add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "uk-statutory-pay": {
      "type": "http",
      "url": "https://uk-statutory-sick-pay-maternity-pay-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

Node 20 or newer is needed for the local `npx` version.

## Example prompts

- "I earn £145 a week and work 5 days. I was off sick for 3 days in June 2026. How much Statutory Sick Pay do I get?"
- "My baby is due on 15 October 2026 and I earn £500 a week. How much maternity pay will I get, week by week?"
- "I started my job in February 2026 and my baby is due in October 2026. Do I qualify for Statutory Maternity Pay?"
- "What is the minimum wage for a 20 year old apprentice in 2026?"
- "Does someone on £100 a week get sick pay now that the lower earnings limit has gone?"

## Data sources

All numbers come from gov.uk and legislation.gov.uk pages fetched on 2026-11-02: Rates and thresholds for employers 2025 to 2026 and 2026 to 2027, the SSP manual calculation guide, Statutory Sick Pay, the employer SSP guide, the Employment Rights Act 2025 ss.10 and 11, SI 2026/373, Maternity pay and leave, Paternity pay and leave, Adoption pay and leave, Shared Parental Leave and Pay and National Minimum Wage rates. See [DATA_SOURCES.md](DATA_SOURCES.md) for each item and URL.

## Limitations

- Results are estimates, not legal or payroll advice.
- You supply average weekly earnings. The tool does not work out the 8-week relevant period from payslips.
- SSP for sickness that starts before 6 April 2026 and runs past it falls under the SI 2026/373 transitional rules. The tool flags this but applies the 2025/26 rules to the whole period.
- Linked periods of sickness and SSP already paid in a linked period are not tracked. Give the remaining days only.
- 2027/28 SSP, family pay and lower earnings limit figures were not published on 2026-11-02. Where a result needs them it uses the 2026/27 figure and says so.
- Special cases such as agency workers, directors, very premature births and Maternity Allowance are not modelled.

## More

Calculators for people: [ukmoneycalc.com maternity pay calculator](https://ukmoneycalc.com/calculators/maternity-pay/?utm_source=mcp&utm_medium=uk-statutory-sick-pay-maternity-pay-calculator-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

## Development

```
npm install
npm run build
npm test
```

`src/core.ts` holds all the rules and has no I/O. `src/stdio.ts` is the local entry and `src/worker.ts` is the Cloudflare Worker entry. Both use the same tool registry in `src/tools.ts`.

## License

MIT

<!-- data-servers:start -->
## More data servers from the same author

Each one is free, needs no API key and has a hosted URL you can paste into Claude or ChatGPT.

| server | tools | hosted URL |
|---|---|---|
| [cups-to-grams-mcp](https://github.com/theluckystrike/cups-to-grams-mcp) | convert_ingredient, search_ingredients, scale_recipe, convert_oven_temperature | `https://cups-to-grams-mcp.lipmichal.workers.dev/mcp` |
| [dscr-loan-calculator-mcp](https://github.com/theluckystrike/dscr-loan-calculator-mcp) | calculate_dscr, max_loan_for_target_dscr, rent_needed_for_target_dscr, compare_scenarios, amortization_summary | `https://dscr-loan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [gold-price-per-gram-mcp](https://github.com/theluckystrike/gold-price-per-gram-mcp) | get_gold_price_per_gram, get_metal_prices, calculate_jewelry_value, convert_gold_units | `https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp` |
| [lake-level-mcp](https://github.com/theluckystrike/lake-level-mcp) | search_lakes, get_lake_level, get_lake_history, compare_lakes | `https://lake-level-mcp.lipmichal.workers.dev/mcp` |
| [minimum-wage-mcp](https://github.com/theluckystrike/minimum-wage-mcp) | get_minimum_wage, list_upcoming_increases, compare_states, annual_income_at_minimum_wage | `https://minimum-wage-mcp.lipmichal.workers.dev/mcp` |
| [no-tax-on-overtime-mcp](https://github.com/theluckystrike/no-tax-on-overtime-mcp) | calculate_overtime_deduction, calculate_tips_deduction, calculate_senior_deduction, estimate_tax_savings, explain_eligibility | `https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp` |
| [paycheck-calculator-mcp](https://github.com/theluckystrike/paycheck-calculator-mcp) | calculate_take_home_pay, compare_states_take_home, salary_to_hourly, hourly_to_salary, get_federal_tax_brackets | `https://paycheck-calculator-mcp.lipmichal.workers.dev/mcp` |
| [uk-income-tax-salary-mcp](https://github.com/theluckystrike/uk-income-tax-salary-mcp) | calculate_uk_take_home, get_uk_tax_bands, compare_salaries, marginal_rate_at_income | `https://uk-income-tax-salary-mcp.lipmichal.workers.dev/mcp` |
| [us-federal-holidays-business-days-mcp](https://github.com/theluckystrike/us-federal-holidays-business-days-mcp) | list_federal_holidays, is_business_day, add_business_days, count_business_days, invoice_due_date | `https://us-federal-holidays-business-days-mcp.lipmichal.workers.dev/mcp` |
| [ab-test-sample-size-calculator-mcp](https://github.com/theluckystrike/ab-test-sample-size-calculator-mcp) | calculate_sample_size, estimate_test_duration, test_ab_significance, fisher_exact_test, check_peeking_risk | `https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp` |
| [aca-premium-tax-credit-calculator-mcp](https://github.com/theluckystrike/aca-premium-tax-credit-calculator-mcp) | get_federal_poverty_level, calculate_premium_tax_credit, check_subsidy_cliff, get_aptc_repayment_cap | `https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp` |
| [ap-score-distributions-mcp](https://github.com/theluckystrike/ap-score-distributions-mcp) | get_ap_score_distribution, estimate_ap_percentile, compare_ap_exams, list_ap_exams, estimate_ap_score_from_composite | `https://ap-score-distributions-mcp.lipmichal.workers.dev/mcp` |
| [car-loan-interest-deduction-calculator-mcp](https://github.com/theluckystrike/car-loan-interest-deduction-calculator-mcp) | calculate_car_loan_interest_deduction, calculate_salt_deduction, get_tax_brackets_and_standard_deduction, calculate_child_tax_credit | `https://car-loan-interest-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [estate-gift-tax-exemption-calculator-mcp](https://github.com/theluckystrike/estate-gift-tax-exemption-calculator-mcp) | get_exemption_amounts, calculate_estate_tax, check_gift, compare_years | `https://estate-gift-tax-exemption-calculator-mcp.lipmichal.workers.dev/mcp` |
| [recipe-nutrition-calculator-mcp](https://github.com/theluckystrike/recipe-nutrition-calculator-mcp) | lookup_ingredient_nutrition, calculate_recipe_nutrition, round_nutrition_label, scale_recipe_nutrition | `https://recipe-nutrition-calculator-mcp.lipmichal.workers.dev/mcp` |
| [retirement-contribution-limits-2027-mcp](https://github.com/theluckystrike/retirement-contribution-limits-2027-mcp) | get_contribution_limits, calculate_max_contribution, get_social_security_cola, compare_years | `https://retirement-contribution-limits-2027-mcp.lipmichal.workers.dev/mcp` |
| [section-179-deduction-calculator-mcp](https://github.com/theluckystrike/section-179-deduction-calculator-mcp) | calculate_section_179, calculate_bonus_depreciation, get_vehicle_depreciation_limits, calculate_asset_loan_payment | `https://section-179-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [student-loan-repayment-assistance-plan-calculator-mcp](https://github.com/theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp) | calculate_rap_payment, compare_rap_vs_standard, get_federal_loan_limits, get_plan_transition_dates | `https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [subdomain-finder-mcp](https://github.com/theluckystrike/subdomain-finder-mcp) | find_subdomains, resolve_subdomains, get_certificate_history, summarize_attack_surface | `https://subdomain-finder-mcp.lipmichal.workers.dev/mcp` |

The paid back-office collection (invoices, VAT, PDFs, spreadsheets) is at https://mcp.zovo.one
<!-- data-servers:end -->
