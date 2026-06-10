export interface UserProfile {
  id: string;
  firebase_uid: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  role?: string;
  // Onboarding fields
  name?: string | null;
  phone?: string | null;
  dob?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  bio?: string | null;
  headline?: string | null;
  website_url?: string | null;
  quote?: string | null;
  trust_badge?: boolean;
  occupation_role?: string | null;
  network_size?: string | null;
  education?: string | null;
  specialized_field?: string | null;
  manages_money_people_system?: string | null;
  physical_intellectual_limitations?: string | null;
  ig_url?: string | null;
  tiktok_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  reddit_url?: string | null;
  yt_url?: string | null;
  fb_url?: string | null;
  snapchat_url?: string | null;
}

export interface UpdateUserPayload {
  username?: string;
  display_name?: string;
  photo_url?: string;
  bio?: string;
  headline?: string;
  city?: string;
  website_url?: string;
}
