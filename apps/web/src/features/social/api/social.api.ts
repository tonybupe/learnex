// features/social/api/social.api.ts
import { api } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import type { 
  FollowStats, 
  FollowActionResponse,
  FollowersResponse, 
  FollowingResponse 
} from "@/types/api";

export async function followUser(userId: number): Promise<FollowActionResponse> {
  const response = await api.post<FollowActionResponse>(endpoints.social.follow(userId));
  return response.data;
}

export async function unfollowUser(userId: number): Promise<FollowActionResponse> {
  const response = await api.delete<FollowActionResponse>(endpoints.social.follow(userId));
  return response.data;
}

export async function getFollowers(
  userId: number, 
  page = 1, 
  limit = 20
): Promise<FollowersResponse> {
  const response = await api.get<FollowersResponse>(endpoints.social.followers(userId), {
    params: { page, limit }
  });
  return response.data;
}

export async function getFollowing(
  userId: number,
  page = 1,
  limit = 20
): Promise<FollowingResponse> {
  const response = await api.get<FollowingResponse>(endpoints.social.following(userId), {
    params: { page, limit }
  });
  return response.data;
}

export async function getFollowStats(userId: number): Promise<FollowStats> {
  const response = await api.get<FollowStats>(endpoints.social.stats(userId));
  return response.data;
}

export async function checkFollowStatus(userId: number): Promise<{ is_following: boolean }> {
  const response = await api.get<{ is_following: boolean }>(`/social/${userId}/follow-status`);
  return response.data;
}