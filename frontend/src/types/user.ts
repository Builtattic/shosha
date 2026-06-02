export interface UserProfile {
  id: string;
  firebase_uid: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
