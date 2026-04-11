// features/social/types/social.types.ts
import type { UserProfile } from '@/features/users/types/user.types';

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface Follower {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  follower: UserProfile;
}

export interface Following {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  following: UserProfile;
}

// Add this missing type
export interface FollowActionResponse {
  success: boolean;
  message: string;
  stats: FollowStats;
}

export interface FollowersResponse {
  items: Follower[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface FollowingResponse {
  items: Following[];
  total: number;
  page: number;
  size: number;
  pages: number;
}