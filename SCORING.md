# Shosha Score — Logic & Graph

How an account's Shosha Score is computed, stored, and visualized.

## TL;DR

```
Δ      = BaseScore × (IY · P · M · E · AB · RY · AW · RP · IN · C) / 10
decay  = |Δ| / (|Δ| + 1000)
score  = previousScore + Δ × (decay + 1)
```

Every account starts at **1000** and moves event-by-event as approved reports land in the ledger.

## The pipeline

The scoring engine lives in [src/lib/scoring.ts](src/lib/scoring.ts). Each approved report runs through four steps.

### 1. BaseScore — *what was the deed?*

A hardcoded workbook table, `SHEET_SCORING_INDEX` ([scoring.ts:175-277](src/lib/scoring.ts#L175-L277)), maps every supported deed to a signed base value:

| Category | Range |
|---|---|
| Micro / Everyday | ±10 – ±30 |
| Social / Interpersonal | ±50 – ±100 |
| Online Behavior | ±50 – ±120 |
| Financial / Transactional | ±100 – ±300 |
| Professional / Power Use | ±200 – ±600 |
| Community / Public Impact | ±150 – ±500 |
| Health / Safety | ±300 – ±900 |
| Legal / Criminal | ±200 – ±1000 |
| Large Scale / Systemic | ±500 – ±1000 |
| Extreme Impact | ±1000 – ±10000 |

Positive deeds add; negative deeds subtract.

### 2. MultiplierQuotient — *who did it, and how?*

Ten multipliers, each in the range **0.5 – 3.0**, are multiplied together ([scoring.ts:378-384](src/lib/scoring.ts#L378-L384)):

| Symbol | Name | Source |
|---|---|---|
| IY | Identity | onboarding (specialized field) |
| P | Power | onboarding (role) |
| M | Means | onboarding (management scope) |
| E | Environment | onboarding (region) |
| AB | Ability | onboarding (disability) |
| RY | Responsibility | onboarding (follower reach) |
| AW | Awareness | onboarding (education + specialization) |
| RP | Reputation | derived from repetition history |
| IN | Intent | chosen per event |
| C | Circumstances | chosen per event |

Eight come from the reporting account's profile via `profileMultipliersFromWorkbookProfile` ([scoring.ts:470-511](src/lib/scoring.ts#L470-L511)). Two — Intent and Circumstances — are picked at filing time, per event.

With a neutral profile (all multipliers = 1) the quotient is 1.0. A high-power, high-awareness, high-intent actor doing the same deed can multiply impact 100×+.

### 3. Delta — *by how much does the score move?*

```
Δ = BaseScore × multiplierQuotient / 10
```

([scoring.ts:516-518](src/lib/scoring.ts#L516-L518))

### 4. Decay — *diminishing returns on big swings*

```
decay = |Δ| / (|Δ| + 1000)
score = previousScore + Δ × (decay + 1)
```

([scoring.ts:566-577](src/lib/scoring.ts#L566-L577)). `WORKBOOK_DECAY_DENOMINATOR = 1000`.

Small deltas barely move the score. Huge deltas asymptotically approach **2× their face value** instead of growing linearly — a single event can't dominate a lifetime score.

## Windowed view (W1 / W2 / W3)

`sumDeltasByAge` ([scoring.ts:648-666](src/lib/scoring.ts#L648-L666)) buckets every ledger entry by age:

| Window | Age | UI label |
|---|---|---|
| W1 | ≤ 7 days | "This Week" |
| W2 | 8 – 30 days | "This Month" |
| W3 | > 30 days | "All Time" |

Each bucket's summed delta runs through the decay formula sequentially. This powers the three-card summary in [src/components/profile/ScoreLedgerPanel.tsx](src/components/profile/ScoreLedgerPanel.tsx).

## Replay engine

[src/lib/services/accountScoreReplay.ts](src/lib/services/accountScoreReplay.ts) rebuilds an account's ledger from scratch:

1. Load every `approved` report for the account, sorted by decision time.
2. For each report → resolve workbook BaseScore row, build multipliers from the account's profile plus the report's intent / circumstances / repetition, compute Δ.
3. Push an entry `{ t, delta, cause, baseScore, multiplierQuotient, … }` into the ledger.
4. Persist the ledger and recompute the final score with `calcWorkbookScoreFromEntries`.

This is what runs when admin actions change a report's status — the score is deterministic given the report history.

## The graph

Two chart components exist today.

**[src/components/profile/ProfileTrajectory.tsx](src/components/profile/ProfileTrajectory.tsx)** — *real data.*
Takes `ScoreHistoryPoint[]` from the account's ledger, normalizes to 0–100, draws an SVG cubic-bezier line with dots colored by `cause` (seed / report / audit / decay).

**[src/components/viz/ScoreHistory.tsx](src/components/viz/ScoreHistory.tsx)** — *visual mockup, not live.*
Generates 50 random points with `Math.random() * 800 - 200` and pins the last point to `18,420`. Useful as a visual placeholder; not yet wired to real scores.

## Profile dimension scoring (separate, 0–100 trait view)

`calcProfileScores` ([scoring.ts:102-141](src/lib/scoring.ts#L102-L141)) projects onboarding answers into the eight named dimensions (IY, P, M, E, AB, RY, AW, RP), each snapped to a discrete label like "Leadership" or "Constrained". `calcShoshaScore` ([scoring.ts:147-151](src/lib/scoring.ts#L147-L151)) averages them into a single 0–100 number used by the radar/gauge visualizations in `src/components/viz/`.

This is independent of the workbook ledger above — it summarizes *who the user is* rather than *what they've done*.
