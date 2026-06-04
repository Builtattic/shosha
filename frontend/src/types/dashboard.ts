export interface DashboardUser {
  _id: string;
  name: string | null;
  username: string | null;
  photoUrl: string | null;
  score: number;
  onboardingComplete: boolean;
  occupationRole?: string | null;
  networkSize?: string | null;
  education?: string | null;
  specializedField?: string | null;
  managesMoneyPeopleSystem?: string | null;
  physicalIntellectualLimitations?: string | null;
  phone?: string | null;
  dob?: string | null;
  city?: string | null;
  country?: string | null;
  igUrl?: string | null;
  tiktokUrl?: string | null;
  xUrl?: string | null;
  linkedinUrl?: string | null;
  redditUrl?: string | null;
  ytUrl?: string | null;
  fbUrl?: string | null;
  snapchatUrl?: string | null;
  bio?: string | null;
  quote?: string | null;
  trustBadge?: boolean;
  following: string[];
  followingAccounts: string[];
}

export interface ClaimedAccount {
  _id: string;
  displayName: string;
  avatarUrl?: string | null;
  platform?: string;
}

export interface TrendingPerson {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
  claimedBy?: string | null;
  followUserId?: string | null;
}

export interface MeWithAccountsData {
  user: DashboardUser;
  claimedAccounts: ClaimedAccount[];
}
