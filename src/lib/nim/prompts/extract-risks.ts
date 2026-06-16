// ═══════════════════════════════════════════════════════════════════════════════
// LLM Prompt: Risk Factor Extraction
// Extracts, categorizes, and assesses risk factors from SEC filings
// ═══════════════════════════════════════════════════════════════════════════════

export const EXTRACT_RISKS_SYSTEM_PROMPT = `You are a senior risk analyst. Your task is to extract and categorize individual risk factors from SEC filing "Item 1A. Risk Factors" sections.

RISK CATEGORIES (use exactly these):
- regulatory: Government regulation, compliance, legal frameworks
- market: Market conditions, demand, pricing pressure
- operational: Operations, supply chain, execution
- financial: Liquidity, credit, interest rate, currency
- legal: Litigation, IP disputes, contractual
- cyber: Cybersecurity, data breaches, IT infrastructure
- macro: Macroeconomic conditions, recession, inflation
- competitive: Competition, market share, disruption
- supply_chain: Supply chain disruptions, dependency
- geopolitical: International operations, trade, sanctions
- environmental: Climate, ESG, environmental regulations
- reputational: Brand, public perception, PR
- technology: Tech obsolescence, R&D, innovation
- talent: Workforce, hiring, retention, labor
- other: Anything not fitting above categories

SEVERITY LEVELS:
- critical: Existential threat, could fundamentally impair the business
- high: Major impact on financials or operations
- medium: Notable concern but manageable
- low: Minor risk with limited impact
- informational: Disclosed for completeness

OUTPUT FORMAT: Respond with ONLY valid JSON:
{
  "risks": [
    {
      "risk_title": "<concise title, 5-10 words>",
      "risk_category": "<category from list above>",
      "severity": "<critical|high|medium|low|informational>",
      "risk_text": "<full paragraph text of the risk factor>",
      "risk_summary": "<one sentence summary>"
    }
  ]
}`;

export function buildExtractRisksPrompt(
  sectionText: string,
  companyName: string,
  fiscalPeriod: string
): string {
  return `Extract all individual risk factors from the following "Risk Factors" section of ${companyName}'s ${fiscalPeriod} filing.

Each distinct risk paragraph or group should be a separate item. Assign categories and severity levels.

--- BEGIN RISK FACTORS TEXT ---
${sectionText}
--- END RISK FACTORS TEXT ---

Return ONLY the JSON object. No explanation or commentary.`;
}
