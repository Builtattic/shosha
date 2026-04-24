import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Breakdown, ReportType } from '@/types';
import { clamp } from '@/lib/utils';

export type AdjudicationInput = {
  description: string;
  feelings: string;
  type: ReportType;
  accountDisplayName: string;
  platform: string;
  mediaDescription?: string;
};

export type AiVerdict = {
  valid: boolean;
  confidence: number;
  proposedImpact: number;
  reasoning: string;
  categoryTags: string[];
  abuseFlags: string[];
  analyzedAt: Date;
};

const reportSystemPrompt = `You are the adjudicator for Shosha, a reputation platform for social media accounts. Grade an individual filing for validity and determine how it should impact a score.

Your output must be strict JSON matching the provided schema. No prose outside JSON.

Scoring guidance:
- Vague emotional complaints without specifics: low confidence, small magnitude (-1 to +1).
- Concrete dated incidents with evidence: high confidence, larger magnitude (up to -10 or +10).
- Positive filings produce positive proposedImpact, negative filings produce negative.
- Flag coordinated brigading, off topic vendettas, doxxing, or pure opinion as abuse. Set valid=false and list flags.

Categorize each filing with up to 3 tags from: authenticity, engagement, community, content, impact, harassment, misinformation, philanthropy, professionalism, controversy.`;

const auditSystemPrompt = `You audit a social media account's reputation holistically. Given a list of admin-approved filings and recent posts, return a rebalanced Shosha Score and trait breakdown. Weight recent events more than old ones (exponential decay by days). Do not produce impacts larger than +/- 15 from current score in a single audit.`;

function timeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini timeout')), ms);
    })
  ]);
}

function heuristicAdjudication(input: AdjudicationInput): AiVerdict {
  const text = `${input.description} ${input.feelings}`.toLowerCase();
  const abuseFlags = /(dox|address|brigad|spam|kill|threat)/.test(text) ? ['abuse_risk'] : [];
  const concrete = /\d{4}|yesterday|today|screenshot|message|dm|posted|replied/.test(text);
  const magnitude = concrete ? 3 : 1;
  const proposedImpact = input.type === 'positive' ? magnitude : -magnitude;

  return {
    valid: abuseFlags.length === 0,
    confidence: concrete ? 0.45 : 0.3,
    proposedImpact,
    reasoning: 'Heuristic fallback (AI unavailable).',
    categoryTags: text.includes('harass') ? ['community', 'harassment'] : ['community'],
    abuseFlags,
    analyzedAt: new Date()
  };
}

export async function adjudicateReport(input: AdjudicationInput): Promise<AiVerdict> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return heuristicAdjudication(input);

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: reportSystemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            valid: { type: SchemaType.BOOLEAN },
            confidence: { type: SchemaType.NUMBER },
            proposedImpact: { type: SchemaType.INTEGER },
            reasoning: { type: SchemaType.STRING },
            categoryTags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            abuseFlags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ['valid', 'confidence', 'proposedImpact', 'reasoning', 'categoryTags', 'abuseFlags']
        }
      }
    });
    const prompt = `Account: ${input.accountDisplayName}
Platform: ${input.platform}
Type: ${input.type}
Description: ${input.description}
Feelings: ${input.feelings}
Media: ${input.mediaDescription ?? 'Media proof was supplied.'}`;
    const result = await timeout(model.generateContent(prompt), 20_000);
    const json = JSON.parse(result.response.text());

    return {
      valid: Boolean(json.valid),
      confidence: clamp(Number(json.confidence), 0, 1),
      proposedImpact: Math.max(-10, Math.min(10, Math.trunc(Number(json.proposedImpact)))),
      reasoning: String(json.reasoning).slice(0, 500),
      categoryTags: Array.isArray(json.categoryTags) ? json.categoryTags.slice(0, 3) : [],
      abuseFlags: Array.isArray(json.abuseFlags) ? json.abuseFlags : [],
      analyzedAt: new Date()
    };
  } catch {
    return heuristicAdjudication(input);
  }
}

export type AuditOutput = {
  newScore: number;
  breakdown: Breakdown;
  summary: string;
};

export async function runFullAudit(input: {
  account: { score: number; displayName: string; platform: string; breakdown: Breakdown };
  approvedReports: unknown[];
  recentPosts: unknown[];
}): Promise<AuditOutput> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      newScore: input.account.score,
      breakdown: input.account.breakdown,
      summary: 'Heuristic fallback (AI unavailable). No material score movement was applied.'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: auditSystemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            newScore: { type: SchemaType.INTEGER },
            breakdown: {
              type: SchemaType.OBJECT,
              properties: {
                authenticity: { type: SchemaType.INTEGER },
                engagement: { type: SchemaType.INTEGER },
                community: { type: SchemaType.INTEGER },
                content: { type: SchemaType.INTEGER },
                impact: { type: SchemaType.INTEGER }
              },
              required: ['authenticity', 'engagement', 'community', 'content', 'impact']
            },
            summary: { type: SchemaType.STRING }
          },
          required: ['newScore', 'breakdown', 'summary']
        }
      }
    });
    const result = await timeout(model.generateContent(JSON.stringify(input)), 20_000);
    const json = JSON.parse(result.response.text());
    const bounded = clamp(Number(json.newScore), input.account.score - 15, input.account.score + 15);

    return {
      newScore: Math.round(clamp(bounded, 0, 100)),
      breakdown: {
        authenticity: Math.round(clamp(Number(json.breakdown.authenticity))),
        engagement: Math.round(clamp(Number(json.breakdown.engagement))),
        community: Math.round(clamp(Number(json.breakdown.community))),
        content: Math.round(clamp(Number(json.breakdown.content))),
        impact: Math.round(clamp(Number(json.breakdown.impact)))
      },
      summary: String(json.summary).slice(0, 500)
    };
  } catch {
    return {
      newScore: input.account.score,
      breakdown: input.account.breakdown,
      summary: 'Heuristic fallback (AI unavailable). No material score movement was applied.'
    };
  }
}
