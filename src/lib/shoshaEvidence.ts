import { generateGroundedJson } from '@/lib/gemini';
import {
  resolveSheetBaseImpact,
  SHEET_SCORING_INDEX,
  type SheetImpactType
} from '@/lib/scoring';
import type { AccountRecord } from '@/lib/repos/accounts';
import type { EvidenceProposalRecord } from '@/lib/repos/evidenceProposals';

type RawEvidenceItem = {
  title?: string;
  summary?: string;
  type?: SheetImpactType;
  scoringDeed?: string;
  confidence?: number;
  sourceUrls?: string[];
  eventDate?: string;
};

function suggestedImpact(baseScore: number) {
  const sign = baseScore < 0 ? -1 : 1;
  return sign * Math.max(1, Math.min(10, Math.round(Math.abs(baseScore) / 100)));
}

function normalizeSourceUrls(urls: unknown, fallback: string[]) {
  const fromItem = Array.isArray(urls) ? urls.filter((url): url is string => typeof url === 'string') : [];
  return Array.from(new Set([...fromItem, ...fallback])).slice(0, 6);
}

export async function scanPublicEvidence(account: AccountRecord): Promise<Array<Omit<EvidenceProposalRecord, '_id' | 'createdAt' | 'updatedAt'>>> {
  const deedList = SHEET_SCORING_INDEX.map((row) => `${row.type}: ${row.deed}`).join('\n');
  const prompt = `You are Shosha evidence scan. Find important, publicly cited actions for this public profile:

Name: ${account.displayName}
Profile ID: ${account.profileId ?? account._id}
Known role: ${account.role ?? 'unknown'}

Map each action to exactly one scoring deed from this list:
${deedList}

Rules:
- Return only public, source-backed actions.
- Include both positive and negative actions when strongly supported.
- Do not include rumors, unsourced claims, private contact data, DOB, exact age, disability, or private address.
- Do not score personality, popularity, or ideology by itself; score actions.
- Prefer major actions with durable public evidence.
- Limit to 8 strongest events.

Return only JSON:
{
  "events": [
    {
      "title": "short event title",
      "summary": "public action summary",
      "type": "positive|negative",
      "scoringDeed": "one exact deed from the list",
      "confidence": 0.85,
      "sourceUrls": ["https://..."],
      "eventDate": "2024-01-31"
    }
  ]
}`;

  const result = await generateGroundedJson(prompt, 60_000);
  const parsed = result.json as { events?: RawEvidenceItem[] };
  const fallbackSources = result.sources.map((source) => source.uri);
  const fallbackTitles = result.sources.map((source) => source.title).filter(Boolean);

  return (parsed.events ?? [])
    .map((item) => {
      const type: SheetImpactType = item.type === 'negative' ? 'negative' : 'positive';
      const scoringRow = resolveSheetBaseImpact(item.scoringDeed ?? '', type);
      const confidence = Math.max(0, Math.min(1, Number(item.confidence ?? 0.5)));
      const sourceUrls = normalizeSourceUrls(item.sourceUrls, fallbackSources);
      return {
        accountId: account._id,
        profileId: account.profileId,
        title: String(item.title || scoringRow.deed).slice(0, 160),
        summary: String(item.summary || scoringRow.deed).slice(0, 500),
        type,
        scoringDeed: scoringRow.deed,
        scoringCategory: scoringRow.category,
        baseScore: scoringRow.baseScore,
        suggestedImpact: suggestedImpact(scoringRow.baseScore),
        confidence,
        sourceUrls,
        sourceTitles: fallbackTitles.slice(0, 6),
        eventDate: item.eventDate ? String(item.eventDate).slice(0, 30) : undefined,
        status: 'pending' as const,
        reviewedAt: null,
        reviewedBy: null
      };
    })
    .filter((item) => item.confidence >= 0.45 && item.sourceUrls.length > 0)
    .slice(0, 8);
}
