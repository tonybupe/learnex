// features/social/hooks/useFollow.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import * as socialApi from '../api/social.api';
import { userKeys } from '@/features/users/hooks/useUser';
import type { 
  FollowStats, 
  FollowActionResponse,
  FollowersResponse, 
  FollowingResponse 
} from '@/types/api';

export const socialKeys = {
  all: ['social'] as const,
  followers: (userId: number) => [...socialKeys.all, 'followers', userId] as const,
  following: (userId: number) => [...socialKeys.all, 'following', userId] as const,
  stats: (userId: number) => [...socialKeys.all, 'stats', userId] as const,
};

export function useFollow(userId: number) {
  const queryClient = useQueryClient();

  const statsQuery = useQuery<FollowStats, Error>({
    queryKey: socialKeys.stats(userId),
    queryFn: () => socialApi.getFollowStats(userId),
    staleTime: 30 * 1000,
  });

  const followMutation = useMutation<FollowActionResponse, Error, void>({
    mutationFn: () => socialApi.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.stats(userId) });
      queryClient.invalidateQueries({ queryKey: socialKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
    },
  });

  const unfollowMutation = useMutation<FollowActionResponse, Error, void>({
    mutationFn: () => socialApi.unfollowUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.stats(userId) });
      queryClient.invalidateQueries({ queryKey: socialKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
    },
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    isFollowing: statsQuery.data?.is_following ?? false,
    followersCount: statsQuery.data?.followers_count ?? 0,
    followingCount: statsQuery.data?.following_count ?? 0,
    follow: () => followMutation.mutate(),
    unfollow: () => unfollowMutation.mutate(),
    isFollowLoading: followMutation.isPending || unfollowMutation.isPending,
  };
}

export function useFollowers(userId: number, limit = 20) {
  return useInfiniteQuery<FollowersResponse, Error>({
    queryKey: [...socialKeys.followers(userId), limit],
    queryFn: ({ pageParam = 1 }) => socialApi.getFollowers(userId, pageParam as number, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !!userId,
  });
}

export function useFollowing(userId: number, limit = 20) {
  return useInfiniteQuery<FollowingResponse, Error>({
    queryKey: [...socialKeys.following(userId), limit],
    queryFn: ({ pageParam = 1 }) => socialApi.getFollowing(userId, pageParam as number, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !!userId,
  });
}