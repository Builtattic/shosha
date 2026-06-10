import { apiClient } from '@/lib/apiClient';

export async function followUser(userId: string): Promise<{ following: boolean }> {
  const res = await apiClient.post(`/users/${userId}/follow`);
  return res.data;
}

export async function unfollowUser(userId: string): Promise<{ following: boolean }> {
  const res = await apiClient.delete(`/users/${userId}/follow`);
  return res.data;
}

export async function getFollowStatus(
  userId: string,
): Promise<{ is_following: boolean; user_id: string }> {
  const res = await apiClient.get(`/users/${userId}/follow-status`);
  return res.data;
}

export async function getConnections(
  userId: string,
  type: 'followers' | 'following',
  limit = 50,
): Promise<{
  type: string;
  total: number;
  users: Array<{
    id: string;
    username: string;
    display_name: string | null;
    photo_url: string | null;
    is_self: boolean;
    is_following: boolean;
  }>;
}> {
  const res = await apiClient.get(
    `/users/${userId}/connections?type=${type}&limit=${limit}`,
  );
  return res.data;
}
