import type { AppUser, ProfileFieldVisibility, ProfileVisibilitySettings } from '@/lib/repos/users';

export const profileVisibilityOptions = ['public', 'followers', 'private'] as const;

export const defaultProfileVisibility: ProfileVisibilitySettings = {
  socialLinks: 'followers',
  location: 'followers',
  website: 'followers',
};

export const profileFieldKeys = ['socialLinks', 'location', 'website'] as const;
export type ProfileFieldKey = (typeof profileFieldKeys)[number];

export function normalizeProfileVisibility(input: unknown): ProfileVisibilitySettings {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return {
    socialLinks: normalizeVisibilityValue(value.socialLinks),
    location: normalizeVisibilityValue(value.location),
    website: normalizeVisibilityValue(value.website),
  };
}

export function visibilityFor(user: Pick<AppUser, 'profileFieldVisibility'> | null | undefined, field: ProfileFieldKey): ProfileFieldVisibility {
  const raw = user?.profileFieldVisibility?.[field];
  return profileVisibilityOptions.includes(raw as ProfileFieldVisibility)
    ? raw as ProfileFieldVisibility
    : 'public';
}

export function canViewProfileField(
  owner: Pick<AppUser, '_id' | 'followers' | 'profileFieldVisibility'> | null | undefined,
  viewer: Pick<AppUser, '_id'> | null | undefined,
  field: ProfileFieldKey
) {
  if (!owner) return true;
  if (viewer?._id && viewer._id === owner._id) return true;

  const visibility = visibilityFor(owner, field);
  if (visibility === 'public') return true;
  if (visibility === 'private') return false;

  return Boolean(viewer?._id && (owner.followers ?? []).includes(viewer._id));
}

export function restrictedLabel(visibility: ProfileFieldVisibility) {
  return visibility === 'followers' ? 'Visible to followers only' : 'Private';
}

function normalizeVisibilityValue(value: unknown): ProfileFieldVisibility {
  return profileVisibilityOptions.includes(value as ProfileFieldVisibility)
    ? value as ProfileFieldVisibility
    : 'followers';
}
