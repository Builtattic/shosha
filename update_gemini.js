const fs = require('fs');

const path = 'src/lib/gemini.ts';
let content = fs.readFileSync(path, 'utf8');

const oldVerdict = `export type AiVerdict = {
  valid: boolean;
  confidence: number;
  proposedImpact: number;
  reasoning: string;
  categoryTags: string[];
  abuseFlags: string[];
  analyzedAt: Date;
};`;

const newVerdict = `export type AiVerdict = {
  valid: boolean;
  confidence: number;
  proposedImpact: number;
  reasoning: string;
  categoryTags: string[];
  abuseFlags: string[];
  isAiFabricated: boolean;
  analyzedAt: Date;
};`;

content = content.replace(oldVerdict.replace(/\r\n/g, '\n'), newVerdict);
content = content.replace(oldVerdict, newVerdict);

const oldPrompt = `const reportSystemPrompt = \`You are the Shosha adjudicator, grading a filing for validity and score impact.

Return strict JSON only:
{
  "valid": true,
  "confidence": 0.75,
  "proposedImpact": 3,
  "reasoning": "brief reason",
  "categoryTags": ["community"],
  "abuseFlags": []
}

Scoring guidance:
- Vague emotional complaints without specifics: low confidence, small magnitude (-1 to +1).
- Concrete dated incidents with evidence: high confidence, larger magnitude (up to -10 or +10).
- Positive filings produce positive proposedImpact, negative filings produce negative.
- Flag coordinated brigading, off-topic vendettas, doxxing, or pure opinion as abuse. Set valid=false and list flags.

Categorize each filing with up to 3 tags from: authenticity, engagement, community, content, impact, harassment, misinformation, philanthropy, professionalism, controversy.\`;`;

const newPrompt = `const reportSystemPrompt = \`You are the Shosha adjudicator, grading a filing for validity and score impact.

Return strict JSON only:
{
  "valid": true,
  "confidence": 0.75,
  "proposedImpact": 3,
  "reasoning": "brief reason",
  "categoryTags": ["community"],
  "abuseFlags": [],
  "isAiFabricated": false
}

Scoring guidance:
- Vague emotional complaints without specifics: low confidence, small magnitude (-1 to +1).
- Concrete dated incidents with evidence: high confidence, larger magnitude (up to -10 or +10).
- Positive filings produce positive proposedImpact, negative filings produce negative.
- Flag coordinated brigading, off-topic vendettas, doxxing, or pure opinion as abuse. Set valid=false and list flags.
- Also evaluate if the report text appears to be AI-generated/fabricated and set isAiFabricated to true if it does.

Categorize each filing with up to 3 tags from: authenticity, engagement, community, content, impact, harassment, misinformation, philanthropy, professionalism, controversy.\`;`;

content = content.replace(oldPrompt.replace(/\r\n/g, '\n'), newPrompt);
content = content.replace(oldPrompt, newPrompt);

const oldHeur = `  return {
    valid: abuseFlags.length === 0,
    confidence: concrete ? 0.45 : 0.3,
    proposedImpact,
    reasoning: 'Shosha heuristic fallback.',
    categoryTags: text.includes('harass') ? ['community', 'harassment'] : ['community'],
    abuseFlags,
    analyzedAt: new Date()
  };`;

const newHeur = `  return {
    valid: abuseFlags.length === 0,
    confidence: concrete ? 0.45 : 0.3,
    proposedImpact,
    reasoning: 'Shosha heuristic fallback.',
    categoryTags: text.includes('harass') ? ['community', 'harassment'] : ['community'],
    abuseFlags,
    isAiFabricated: false,
    analyzedAt: new Date()
  };`;

content = content.replace(oldHeur.replace(/\r\n/g, '\n'), newHeur);
content = content.replace(oldHeur, newHeur);

const oldRet = `    return {
      valid: Boolean(json.valid),
      confidence: clamp(Number(json.confidence), 0, 1),
      proposedImpact: Math.max(-10, Math.min(10, Math.trunc(Number(json.proposedImpact)))),
      reasoning: String(json.reasoning ?? '').slice(0, 500),
      categoryTags: Array.isArray(json.categoryTags) ? json.categoryTags.slice(0, 3).map(String) : [],
      abuseFlags: Array.isArray(json.abuseFlags) ? json.abuseFlags.map(String) : [],
      analyzedAt: new Date()
    };`;

const newRet = `    return {
      valid: Boolean(json.valid),
      confidence: clamp(Number(json.confidence), 0, 1),
      proposedImpact: Math.max(-10, Math.min(10, Math.trunc(Number(json.proposedImpact)))),
      reasoning: String(json.reasoning ?? '').slice(0, 500),
      categoryTags: Array.isArray(json.categoryTags) ? json.categoryTags.slice(0, 3).map(String) : [],
      abuseFlags: Array.isArray(json.abuseFlags) ? json.abuseFlags.map(String) : [],
      isAiFabricated: Boolean(json.isAiFabricated),
      analyzedAt: new Date()
    };`;

content = content.replace(oldRet.replace(/\r\n/g, '\n'), newRet);
content = content.replace(oldRet, newRet);

fs.writeFileSync(path, content, 'utf8');
