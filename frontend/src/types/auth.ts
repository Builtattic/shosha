export type AuthMethod = 'google' | 'email' | 'phone';

export interface LoginPayload {
  method: AuthMethod;
  token: string; // Firebase ID token
}

export interface AuthSession {
  firebase_uid: string;
  access_token: string;
  refresh_token?: string;
  expires_at: string;
}
