import type { Breakdown, ReportType } from '@/types';
import { clamp } from '@/lib/utils';

export type AdjudicationInput = {
  description: string;
  feelings: string;
  type: ReportType;
  accountDisplayName: string;
  platform: string;
  mediaDescription?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
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

export type AuditOutput = {
  newScore: number;
  breakdown: Breakdown;
  summary: string;
};

const reportSystemPrompt = `You are the Shosha adjudicator, grading a filing for validity and score impact.

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

Categorize each filing with up to 3 tags from: authenticity, engagement, community, content, impact, harassment, misinformation, philanthropy, professionalism, controversy.`;

const auditSystemPrompt = `You audit a social media account's reputation holistically for Shosha. Given approved filings and recent posts, return a rebalanced Shosha Score and trait breakdown. Weight recent events more than old ones. Do not move score more than +/- 15 from current score in a single audit.

Return strict JSON only:
{
  "newScore": 60,
  "breakdown": {
    "authenticity": 60,
    "engagement": 60,
    "community": 60,
    "content": 60,
    "impact": 60
  },
  "summary": "brief summary"
}`;

function aiKey() {
  return process.env.GEMINI_API_KEY;
}

function aiModel() {
  return process.env.GEMINI_MODEL || process.env.GEMINI_DISCOVERY_MODEL || 'gemini-3-pro-preview';
}

function discoveryModel() {
  return process.env.GEMINI_DISCOVERY_MODEL || 'gemini-3-pro-preview';
}

function timeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Shosha analysis timeout')), ms);
    })
  ]);
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  if (start === -1) return {};
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1));
        } catch {
          return {};
        }
      }
    }
  }
  return {};
}

async function callShoshaModel(body: unknown, timeoutMs = 30_000) {
  const key = aiKey();
  const model = aiModel();
  if (!key || !model) {
    throw new Error('Shosha analysis is not configured.');
  }
  const response = await timeout(
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    }),
    timeoutMs
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (detail.includes('reported as leaked')) {
      throw new Error('Shosha analysis failed because GEMINI_API_KEY was reported as leaked. Rotate the key in Google AI Studio and update .env.local.');
    }
    throw new Error(`Shosha analysis failed with status ${response.status}.`);
  }
  const payload = await response.json();
  return payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n') ?? '';
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
    reasoning: 'Shosha heuristic fallback.',
    categoryTags: text.includes('harass') ? ['community', 'harassment'] : ['community'],
    abuseFlags,
    analyzedAt: new Date()
  };
}

export async function adjudicateReport(input: AdjudicationInput): Promise<AiVerdict> {
  if (!aiKey() || !aiModel()) return heuristicAdjudication(input);

  try {
    const promptText = `${reportSystemPrompt}

Account: ${input.accountDisplayName}
Platform: ${input.platform}
Type: ${input.type}
Description: ${input.description}
Feelings: ${input.feelings}
Media: ${input.mediaDescription ?? 'Media proof was supplied.'}
${input.mediaType === 'image' && input.mediaUrl ? 'An image is attached as inline media. Examine it carefully and reference what you see in reasoning.' : ''}
${input.mediaType === 'video' && input.mediaUrl ? `A video proof was uploaded but cannot be analyzed inline. Source: ${input.mediaUrl}` : ''}`;

    const parts: Array<Record<string, unknown>> = [{ text: promptText }];
    if (input.mediaType === 'image' && input.mediaUrl) {
      try {
        const mediaRes = await timeout(fetch(input.mediaUrl, { cache: 'no-store' }), 8_000);
        if (mediaRes.ok) {
          const contentType = mediaRes.headers.get('content-type') ?? 'image/jpeg';
          const buffer = Buffer.from(await mediaRes.arrayBuffer());
          if (buffer.byteLength <= 5 * 1024 * 1024) {
            parts.push({
              inlineData: {
                mimeType: contentType.split(';')[0].trim(),
                data: buffer.toString('base64')
              }
            });
          }
        }
      } catch (err) {
        console.warn('[shosha-ai] media fetch failed', (err as Error).message);
      }
    }

    const text = await callShoshaModel({ contents: [{ parts }] }, 30_000);
    const json = extractJsonObject(text) as Partial<AiVerdict>;

    return {
      valid: Boolean(json.valid),
      confidence: clamp(Number(json.confidence), 0, 1),
      proposedImpact: Math.max(-10, Math.min(10, Math.trunc(Number(json.proposedImpact)))),
      reasoning: String(json.reasoning ?? '').slice(0, 500),
      categoryTags: Array.isArray(json.categoryTags) ? json.categoryTags.slice(0, 3).map(String) : [],
      abuseFlags: Array.isArray(json.abuseFlags) ? json.abuseFlags.map(String) : [],
      analyzedAt: new Date()
    };
  } catch {
    return heuristicAdjudication(input);
  }
}

export async function runFullAudit(input: {
  account: { score: number; displayName: string; platform: string; breakdown: Breakdown };
  approvedReports: unknown[];
  recentPosts: unknown[];
}): Promise<AuditOutput> {
  if (!aiKey() || !aiModel()) {
    return {
      newScore: input.account.score,
      breakdown: input.account.breakdown,
      summary: 'Shosha heuristic fallback. No material score movement was applied.'
    };
  }

  try {
    const text = await callShoshaModel({
      contents: [{ parts: [{ text: `${auditSystemPrompt}\n\n${JSON.stringify(input)}` }] }]
    }, 20_000);
    const json = extractJsonObject(text) as {
      newScore?: number;
      breakdown?: Partial<Record<keyof Breakdown, number>>;
      summary?: string;
    };
    const bounded = clamp(Number(json.newScore), input.account.score - 15, input.account.score + 15);
    const breakdown = json.breakdown ?? {};

    return {
      newScore: Math.round(clamp(bounded, 0, 100)),
      breakdown: {
        authenticity: Math.round(clamp(Number(breakdown.authenticity))),
        engagement: Math.round(clamp(Number(breakdown.engagement))),
        community: Math.round(clamp(Number(breakdown.community))),
        content: Math.round(clamp(Number(breakdown.content))),
        impact: Math.round(clamp(Number(breakdown.impact)))
      },
      summary: String(json.summary ?? '').slice(0, 500)
    };
  } catch {
    return {
      newScore: input.account.score,
      breakdown: input.account.breakdown,
      summary: 'Shosha heuristic fallback. No material score movement was applied.'
    };
  }
}

export async function generateGroundedJson(prompt: string, timeoutMs = 45_000): Promise<{ json: unknown; sources: Array<{ uri: string; title: string }>; searchQueries: string[]; grounded: boolean }> {
  const key = aiKey();
  const model = discoveryModel();
  if (!key || !model) {
    throw new Error('Shosha discovery is not configured.');
  }

  const response = await timeout(
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2 }
      }),
      cache: 'no-store'
    }),
    timeoutMs
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (detail.includes('reported as leaked')) {
      throw new Error('Shosha discovery failed because GEMINI_API_KEY was reported as leaked. Rotate the key in Google AI Studio and update .env.local.');
    }
    throw new Error(`Shosha discovery failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n') ?? '';
  const grounding = payload?.candidates?.[0]?.groundingMetadata;
  const sources =
    grounding?.groundingChunks
      ?.map((chunk: { web?: { uri?: string; title?: string } }) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title
      }))
      .filter((source: { uri?: string; title?: string }) => source.uri && source.title) ?? [];

  return {
    json: extractJsonObject(text),
    sources,
    searchQueries: grounding?.webSearchQueries ?? [],
    grounded: Boolean(grounding)
  };
}
