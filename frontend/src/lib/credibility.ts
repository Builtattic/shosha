// Credibility scoring driven solely by profile completion + verification.
// Reports made by other users do NOT influence this number — only:
//   • how much of the profile is filled in
//   • whether the user has earned the Trust Badge (verification)
//
// Section weights (total 100):
//   Basic Info        25
//   Profile Questions 25
//   Social Links      10  (gate: at least 4 of 8)
//   Profile Extras    15  (photo + bio + quote, 5 each)
//   Verification      20  (trustBadge boolean)
//
// Max from completion alone: 80%. The remaining 20% requires verification.

export const CRED_SECTIONS = {
  basicInfo:        { weight: 30, label: 'Basic Info' },
  questions:        { weight: 25, label: 'Questions' },
  socialLinks:      { weight: 10, label: 'Social Links' },
  profileExtras:    { weight: 15, label: 'Profile Extras' },
  verification:     { weight: 20, label: 'Verification' },
} as const;

export type CredibilitySection = keyof typeof CRED_SECTIONS;

export type CredibilityInput = {
  // Basic Info
  name?: string;
  username?: string;
  phone?: string;
  dob?: string;
  city?: string;
  country?: string;
  // Questions
  occupationRole?: string;
  networkSize?: string;
  education?: string;
  specializedField?: string;
  managesMoneyPeopleSystem?: string;
  physicalIntellectualLimitations?: string;
  // Social Links
  igUrl?: string;
  tiktokUrl?: string;
  xUrl?: string;
  linkedinUrl?: string;
  redditUrl?: string;
  ytUrl?: string;
  fbUrl?: string;
  snapchatUrl?: string;
  // Profile Extras
  photoUrl?: string;
  bio?: string;
  quote?: string;
  // Verification
  trustBadge?: boolean;
};

export type CredibilityBreakdown = Record<CredibilitySection, {
  weight: number;
  earned: number; // 0..weight
  ratio: number;  // 0..1
  label: string;
  hint?: string;
}>;

const isFilled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

const BASIC_FIELDS = ['name','username','phone','dob','city','country'] as const;
const QUESTION_FIELDS = [
  'occupationRole','networkSize','education','specializedField',
  'managesMoneyPeopleSystem','physicalIntellectualLimitations',
] as const;
const SOCIAL_FIELDS = [
  'igUrl','tiktokUrl','xUrl','linkedinUrl','redditUrl','ytUrl','fbUrl','snapchatUrl',
] as const;

export const SOCIAL_LINKS_GATE = 4; // need at least 4 to count

export function calcCredibility(input: CredibilityInput): {
  total: number;          // 0..100, rounded
  breakdown: CredibilityBreakdown;
} {
  // Basic Info
  const basicFilled = BASIC_FIELDS.filter((k) => isFilled(input[k])).length;
  const basicRatio = basicFilled / BASIC_FIELDS.length;

  // Questions
  const qFilled = QUESTION_FIELDS.filter((k) => isFilled(input[k])).length;
  const qRatio = qFilled / QUESTION_FIELDS.length;

  // Social: smooth ramp up to the gate, full credit at gate or above
  const socialFilled = SOCIAL_FIELDS.filter((k) => isFilled(input[k])).length;
  const socialRatio = Math.min(1, socialFilled / SOCIAL_LINKS_GATE);

  // Profile extras: 3 sub-items each worth 1/3
  const extrasFilled = [input.photoUrl, input.bio, input.quote].filter(isFilled).length;
  const extrasRatio = extrasFilled / 3;

  // Verification: binary
  const verifRatio = input.trustBadge ? 1 : 0;

  const breakdown: CredibilityBreakdown = {
    basicInfo: {
      weight: CRED_SECTIONS.basicInfo.weight,
      earned: round1(CRED_SECTIONS.basicInfo.weight * basicRatio),
      ratio: basicRatio,
      label: CRED_SECTIONS.basicInfo.label,
      hint: `${basicFilled}/${BASIC_FIELDS.length} fields`,
    },
    questions: {
      weight: CRED_SECTIONS.questions.weight,
      earned: round1(CRED_SECTIONS.questions.weight * qRatio),
      ratio: qRatio,
      label: CRED_SECTIONS.questions.label,
      hint: `${qFilled}/${QUESTION_FIELDS.length} answered`,
    },
    socialLinks: {
      weight: CRED_SECTIONS.socialLinks.weight,
      earned: round1(CRED_SECTIONS.socialLinks.weight * socialRatio),
      ratio: socialRatio,
      label: CRED_SECTIONS.socialLinks.label,
      hint: `${socialFilled}/${SOCIAL_LINKS_GATE} links min`,
    },
    profileExtras: {
      weight: CRED_SECTIONS.profileExtras.weight,
      earned: round1(CRED_SECTIONS.profileExtras.weight * extrasRatio),
      ratio: extrasRatio,
      label: CRED_SECTIONS.profileExtras.label,
      hint: `${extrasFilled}/3 (photo · about · quote)`,
    },
    verification: {
      weight: CRED_SECTIONS.verification.weight,
      earned: CRED_SECTIONS.verification.weight * verifRatio,
      ratio: verifRatio,
      label: CRED_SECTIONS.verification.label,
      hint: input.trustBadge ? 'Trust Badge earned' : 'Trust Badge required',
    },
  };

  const total = Math.round(
    Object.values(breakdown).reduce((s, b) => s + b.earned, 0)
  );
  return { total, breakdown };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
