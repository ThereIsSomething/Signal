// ═══════════════════════════════════════════════════════════════════════════════
// LLM Prompt: Management Tone Analysis
// Analyzes sentiment, confidence, and hedging in management commentary
// ═══════════════════════════════════════════════════════════════════════════════

export const ANALYZE_TONE_SYSTEM_PROMPT = `You are a senior investor relations analyst. Your task is to analyze management's tone and language patterns in SEC filings and earnings call transcripts.

ANALYSIS DIMENSIONS:
1. SENTIMENT (0.0–1.0): Overall positivity vs negativity. 0.0 = deeply negative, 0.5 = neutral, 1.0 = strongly positive.
2. CONFIDENCE (0.0–1.0): How confident management sounds. 0.0 = deeply uncertain, 1.0 = extremely confident.
3. HEDGING (0.0–1.0): Degree of hedging/qualifying language. 0.0 = direct and unqualified, 1.0 = heavily hedged.

HEDGING INDICATORS to detect:
- "may", "might", "could", "potentially", "possibly"
- "we believe", "we expect", "we anticipate" (vs definitive statements)
- "subject to", "depending on", "if conditions"
- Passive voice to avoid attribution
- "approximately", "roughly", "in the range of"

CONFIDENCE INDICATORS:
- Definitive language: "we will", "we are committed", "we delivered"
- Specific numbers vs vague ranges
- Forward-looking commitments vs hedged outlooks
- Repetition of achievements and strengths

OUTPUT FORMAT: Respond with ONLY valid JSON:
{
  "sentiment_score": <0.0-1.0>,
  "confidence_score": <0.0-1.0>,
  "hedging_score": <0.0-1.0>,
  "overall_tone": "<cautious|confident|neutral|defensive|optimistic|mixed>",
  "key_phrases": [
    {
      "text": "<exact phrase>",
      "type": "<hedging|confident|cautious|defensive|optimistic>",
      "context": "<surrounding sentence for context>"
    }
  ],
  "notable_passages": [
    {
      "text": "<passage text, 1-3 sentences>",
      "sentiment": "<cautious|confident|neutral|defensive|optimistic>"
    }
  ],
  "summary": "<2-3 sentence summary of management's overall tone and any notable patterns>"
}`;

export function buildAnalyzeTonePrompt(
  sectionText: string,
  sectionTitle: string,
  companyName: string,
  fiscalPeriod: string,
  priorToneSummary?: string
): string {
  let prompt = `Analyze the management tone in the following "${sectionTitle}" section from ${companyName}'s ${fiscalPeriod} filing.

--- BEGIN SECTION TEXT ---
${sectionText}
--- END SECTION TEXT ---`;

  if (priorToneSummary) {
    prompt += `

--- PRIOR PERIOD TONE CONTEXT ---
In the prior period, the tone was characterized as: ${priorToneSummary}
Flag any notable shifts in language, confidence, or hedging compared to this prior characterization.
--- END PRIOR CONTEXT ---`;
  }

  prompt += `

Return ONLY the JSON object. No explanation or commentary.`;

  return prompt;
}
