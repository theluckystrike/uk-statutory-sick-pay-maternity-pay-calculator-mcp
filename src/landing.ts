// GET / page for the hosted Worker.
const REPO = "uk-statutory-sick-pay-maternity-pay-calculator-mcp";
const TOOLS: Array<[string, string]> = [
  ["calculate_statutory_sick_pay", "SSP for a sickness period under the 6 April 2026 rules (from day one, no earnings limit, lower of £123.25 or 80% of earnings) or the 2025/26 rules."],
  ["calculate_statutory_maternity_pay", "SMP week by week for 39 weeks, with qualifying week, 26-week service date and lower earnings limit."],
  ["get_minimum_wage_rates", "National Living Wage and National Minimum Wage by age band and apprentice rate, April 2024 to April 2027."],
  ["check_eligibility", "Qualifying conditions for sick, maternity, paternity, adoption and shared parental pay."],
];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function landingPage(origin: string): string {
  const mcp = `${origin}/mcp`;
  const rows = TOOLS.map(([n, d]) => `<tr><td><code>${n}</code></td><td>${esc(d)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UK Statutory Pay MCP</title>
<meta name="description" content="MCP server for UK Statutory Sick Pay after the April 2026 changes, Statutory Maternity Pay and the National Living Wage, from gov.uk rates.">
<style>:root{--bg:#fff;--fg:#1a1a1a;--muted:#555;--line:#ddd;--code:#f4f4f4}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--muted:#aaa;--line:#333;--code:#222}}
body{background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px 16px}
code,pre{background:var(--code);border-radius:4px;font-size:14px}pre{padding:10px;overflow-x:auto}code{padding:1px 4px}
table{border-collapse:collapse;width:100%}td{border-top:1px solid var(--line);padding:8px 6px;vertical-align:top}p.small{color:var(--muted);font-size:14px}a{color:inherit}</style></head>
<body><h1>UK statutory sick pay and maternity pay MCP server</h1>
<p>Gives an AI assistant the UK Statutory Sick Pay rules in force from 6 April 2026, Statutory Maternity, Paternity, Adoption and Shared Parental Pay for 2025/26 and 2026/27, and the National Living Wage rates, with every figure copied from gov.uk.</p>
<h2>Connect</h2>
<p>Hosted endpoint (Streamable HTTP, no sign-in, no token). Paste it into Claude.ai custom connectors or ChatGPT developer mode.</p>
<pre>${esc(mcp)}</pre>
<p>Claude Code</p><pre>claude mcp add --transport http uk-statutory-pay ${esc(mcp)}</pre>
<p>Local (stdio)</p><pre>npx -y github:theluckystrike/${REPO}</pre>
<h2>Tools</h2><table>${rows}</table>
<p>Calculators for people: <a href="https://ukmoneycalc.com/calculators/maternity-pay/?utm_source=mcp&amp;utm_medium=${REPO}">ukmoneycalc.com</a>.
Source: <a href="https://github.com/theluckystrike/${REPO}">github.com/theluckystrike/${REPO}</a>.</p>
<p class="small">Results are estimates, not legal or payroll advice. Part of the Zovo MCP collection: <a href="https://mcp.zovo.one">mcp.zovo.one</a>.</p>
</body></html>`;
}
