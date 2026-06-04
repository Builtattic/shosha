// ── Scoring domain types ───────────────────────────────────────────────────────

/**
 * Five-axis breakdown attached to every scored account.
 * Each dimension is a 0–100 integer reflecting cumulative impact
 * in that category.
 */
export interface Breakdown {
  authenticity: number;
  engagement:   number;
  community:    number;
  content:      number;
  impact:       number;
}

/**
 * Tag identifying what triggered a score change.
 * Used in the account score-history ledger.
 */
export type ScoreCause =
  | 'report'
  | 'dispute_win'
  | 'dispute_loss'
  | 'admin'
  | 'ai'
  | 'initial'
  | 'decay'
  | string; // allow custom causes without breaking TS

/**
 * Minimal slice of UserProfile that the scoring engine reads.
 * Maps V2's snake_case DB fields to the names scoring.ts expects.
 *
 * Backend engineers: populate this from the /api/v1/users/:id response.
 */
export interface ScoringAppUser {
  // Onboarding dimension inputs
  occupationRole?:                string | null; // ← occupation_role
  networkSize?:                   string | null; // ← network_size
  education?:                     string | null;
  specializedField?:              string | null; // ← specialized_field
  managesMoneyPeopleSystem?:      string | null; // ← manages_money_people_system
  physicalIntellectualLimitations?: string | null; // ← physical_intellectual_limitations

  // Derived from report history
  reporterScore?: number;   // 0–100, higher = more credible reporter
}
