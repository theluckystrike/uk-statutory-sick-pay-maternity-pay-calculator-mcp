# Data sources

Every rate, threshold and rule in `src/core.ts` was copied from the pages below. All were fetched on 2026-11-02 (gov.uk content API and legislation.gov.uk XML). Nothing comes from model memory.

| Item | Value used | Source |
|---|---|---|
| SSP weekly rate 2026/27 | £123.25 or 80% of AWE, whichever is lower, from 6 April 2026 to 5 April 2027 | gov.uk rates and thresholds for employers 2026 to 2027; gov.uk/statutory-sick-pay; SSP manual calculation guide |
| SSP paid from day one | Paid from the first full working day in a PIW; a PIW is sickness of at least one full day | SSP manual calculation guide; Employment Rights Act 2025 s.10 |
| SSP lower earnings limit removed | Schedule 11 para 2(c) omitted; s.157(1) becomes the lower of a flat rate and 80% of normal weekly earnings | Employment Rights Act 2025 s.11 |
| Commencement | ss.10 to 13 in force 6 April 2026; transitional regs 3 to 6 | SI 2026/373 |
| SSP 2026/27 day tables | Unrounded daily rates £17.6071 (7), £20.5416 (6), £24.65 (5), £30.8125 (4), £41.0833 (3), £61.625 (2); amounts per days, e.g. 6-day week 4 days £82.17 | gov.uk rates and thresholds for employers 2026 to 2027 |
| SSP worked examples | AWE £185, 5 days, 3 sick: £73.95. AWE £145: £116 a week, 4 days 2 sick £58, 5 days 3 sick £69.60 | SSP manual calculation guide |
| SSP 2025/26 | £118.75 flat; LEL £125; 3 waiting days and 4-day PIW (pre-6 April 2026 law, removed by ERA 2025 s.10) | gov.uk rates and thresholds 2025 to 2026; ERA 2025 s.10 text |
| SSP maximum | 28 weeks; linked periods 8 weeks or less apart | gov.uk/employers-sick-pay |
| SMP, SAP | 90% of AWE for 6 weeks, then £194.32 or 90% (lower) for 33 weeks; 39 weeks in all | gov.uk rates and thresholds 2026 to 2027; gov.uk/maternity-pay-leave; gov.uk/employers-maternity-pay-leave |
| Family flat rate change dates | £187.18 from 6 April 2025; £194.32 from 5 April 2026 ("The SMP rate applies from 5 April 2026") | gov.uk rates and thresholds 2025 to 2026 and 2026 to 2027 |
| SPP, ShPP, SPBP, SNCP | £194.32 or 90% of AWE, whichever is lower (2026/27); £187.18 (2025/26) | same |
| Lower earnings limit | £125 a week (2025/26), £129 a week (2026/27) | gov.uk rates and thresholds (Class 1 NI); gov.uk/maternity-pay-leave eligibility (£129) |
| Qualifying conditions | 26 weeks' continuous employment into the qualifying week, the 15th week before the expected week of childbirth; adoption: by the matching week; shared parental partner test 26 of 66 weeks and £390 in 13 weeks | gov.uk/maternity-pay-leave, gov.uk/paternity-pay-leave, gov.uk/adoption-pay-leave, gov.uk/shared-parental-leave-and-pay |
| NMW and NLW | From 1 April 2026: 21+ £12.71, 18 to 20 £10.85, under 18 £8, apprentice £8. From 1 April 2027: £13.21, £11.27, £8.31, £8.31. April 2025: £12.21, £10, £7.55, £7.55. April 2024: £11.44, £8.60, £6.40, £6.40 | gov.uk/national-minimum-wage-rates; gov.uk rates and thresholds 2026 to 2027 |
| Apprentice rate | Under 19, or 19 and over in the first year | gov.uk/national-minimum-wage-rates |

## Not confirmed from a primary source this session

- 2027/28 SSP, SMP and lower earnings limit: not published on 2026-11-02. Results that need them use the 2026/27 figure and say so (`rate_confirmed: false`).
- Rounding 90% of AWE up to the next penny follows HMRC's usual practice; no gov.uk page fetched this session states it.
- The 26-week service date counts each Sunday-to-Saturday week the employee worked any part of, with the qualifying week as week 26.

## URLs (fetched 2026-11-02)

- https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027 (page updated 2026-09-01)
- https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
- https://www.gov.uk/guidance/statutory-sick-pay-manually-calculate-your-employees-payments (updated 2026-04-06)
- https://www.gov.uk/statutory-sick-pay
- https://www.gov.uk/employers-sick-pay
- https://www.legislation.gov.uk/ukpga/2025/36/section/10
- https://www.legislation.gov.uk/ukpga/2025/36/section/11
- https://www.legislation.gov.uk/uksi/2026/373/made
- https://www.gov.uk/maternity-pay-leave
- https://www.gov.uk/employers-maternity-pay-leave
- https://www.gov.uk/paternity-pay-leave
- https://www.gov.uk/adoption-pay-leave
- https://www.gov.uk/shared-parental-leave-and-pay
- https://www.gov.uk/national-minimum-wage-rates
