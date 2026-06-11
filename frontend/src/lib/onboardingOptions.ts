// Shared option lists for onboarding/profile select fields.
// Values are V1 slug strings persisted verbatim on the backend.
// Imported by both Onboard.tsx and EditProfile.tsx to prevent drift.

export interface OnboardingOption {
  value: string;
  label: string;
}

export const OCCUPATION_ROLES: OnboardingOption[] = [
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'individual_contributor', label: 'Individual Contributor / Job' },
  { value: 'manager', label: 'Manager' },
  { value: 'founder_business_owner', label: 'Founder / Business Owner' },
  { value: 'public_figure_influencer', label: 'Public Figure / Influencer' },
  { value: 'government_political', label: 'Government / Political Role' },
];

export const NETWORK_SIZES: OnboardingOption[] = [
  { value: 'none', label: 'None' },
  { value: '<1k', label: '< 1K' },
  { value: '1k-10k', label: '1K – 10K' },
  { value: '10k-100k', label: '10K – 100K' },
  { value: '100k-1m', label: '100K – 1M' },
  { value: '1m-100m', label: '1M – 100M' },
  { value: '100m+', label: '100M+' },
];

export const EDUCATION_LEVELS: OnboardingOption[] = [
  { value: 'no_formal', label: 'No Formal Education' },
  { value: 'school', label: 'School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'doctorate_specialized', label: 'Doctorate / Specialized' },
];

export const SPECIALIZED_FIELDS: OnboardingOption[] = [
  { value: 'no', label: 'No' },
  { value: 'some_experience', label: 'Some Experience' },
  { value: 'professional', label: 'Professional' },
  { value: 'expert', label: 'Expert' },
];

export const MANAGEMENT_LEVELS: OnboardingOption[] = [
  { value: 'none', label: 'None' },
  { value: 'small_team_limited_control', label: 'Small Team; Limited Control' },
  { value: 'moderate_responsibility', label: 'Moderate Responsibility' },
  { value: 'large_team_major_decisions', label: 'Large Team, Major Decisions' },
  { value: 'organizational_institutional', label: 'Organizational / Institutional Control' },
];

export const LIMITATIONS: OnboardingOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
