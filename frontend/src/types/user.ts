export interface UserProfile {
  id: string;
  firebase_uid: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  // Onboarding fields
  name?: string | null;
  phone?: string | null;
  dob?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  bio?: string | null;
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
  name?: string;
  username?: string;
  phone?: string;
  dob?: string;
  city?: string;
  country?: string;
  bio?: string;
  quote?: string;
  photo_url?: string;
  occupation_role?: string;
  network_size?: string;
  education?: string;
  specialized_field?: string;
  manages_money_people_system?: string;
  physical_intellectual_limitations?: string;
  ig_url?: string;
  tiktok_url?: string;
  x_url?: string;
  linkedin_url?: string;
  reddit_url?: string;
  yt_url?: string;
  fb_url?: string;
  snapchat_url?: string;
  onboarding_complete?: boolean;
}
