import { apiClient } from '@/lib/apiClient';
import type {
  Bubble,
  BubbleDetail,
  BubbleCreatePayload,
  JoinRequest,
} from '@/types/bubble';

export async function listBubbles(limit = 50): Promise<Bubble[]> {
  const res = await apiClient.get<{ items: Bubble[]; next_cursor: string | null }>(
    `/bubbles/?limit=${limit}`,
  );
  return res.data.items;
}

export async function createBubble(payload: BubbleCreatePayload): Promise<BubbleDetail> {
  const res = await apiClient.post<{ bubble: BubbleDetail }>('/bubbles/', payload);
  return res.data.bubble;
}

export async function getBubbleDetail(bubbleId: string): Promise<BubbleDetail> {
  const res = await apiClient.get<{ bubble: BubbleDetail }>(`/bubbles/${bubbleId}`);
  return res.data.bubble;
}

export async function joinBubble(bubbleId: string): Promise<JoinRequest> {
  const res = await apiClient.post<{ request: JoinRequest }>(`/bubbles/${bubbleId}/join`);
  return res.data.request;
}

export async function listJoinRequests(bubbleId: string): Promise<JoinRequest[]> {
  const res = await apiClient.get<{ requests: JoinRequest[] }>(
    `/bubbles/${bubbleId}/join-requests`,
  );
  return res.data.requests;
}

export async function voteOnJoinRequest(
  bubbleId: string,
  targetUserId: string,
  vote: 'approve' | 'reject',
): Promise<JoinRequest> {
  const res = await apiClient.post<{ request: JoinRequest }>(
    `/bubbles/${bubbleId}/join-requests/${targetUserId}/vote`,
    { vote },
  );
  return res.data.request;
}

export async function getBubbleLeaderboard(limit = 10): Promise<Bubble[]> {
  const res = await apiClient.get<{ items: Bubble[] }>(
    `/bubbles/leaderboard?limit=${limit}`,
  );
  return res.data.items;
}
