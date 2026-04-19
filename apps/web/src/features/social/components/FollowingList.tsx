// features/social/components/FollowingList.tsx
import { useFollowing } from '../hooks/useFollow';
import { UserCard } from '@/features/users/components/UserCard';
import { useAuth } from '@/features/auth/useAuth';
import type { Following, UserProfile } from '@/types/api';

interface FollowingListProps {
  userId: number;
}

// Helper function to convert AuthUser to UserProfile
const toUserProfile = (user: any): UserProfile => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  avatar_url: user.avatar_url || user.avatar || null,
  profile: user.profile || null,
  followers_count: user.followers_count || 0,
  following_count: user.following_count || 0,
  created_at: user.created_at || new Date().toISOString(),
  is_active: user.is_active ?? true,
  is_verified: user.is_verified ?? false,
  updated_at: user.updated_at || new Date().toISOString(),
  updated_at: user.updated_at || new Date().toISOString(),
});

export function FollowingList({ userId }: FollowingListProps) {
  const { user: currentUser } = useAuth();
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    error 
  } = useFollowing(userId);

  if (isLoading) {
    return (
      <div className="following-loading" aria-label="Loading following">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="following-skeleton" role="status" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="following-error" role="alert">
        <p className="error-text">Failed to load following</p>
        <button onClick={() => fetchNextPage()} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  const following = Array.isArray(data) ? data : ((data as any)?.items ?? []) ?? [];

  if (following.length === 0) {
    return (
      <div className="following-empty" role="status">
        <div className="empty-icon">👤</div>
        <p className="empty-text">Not following anyone yet</p>
        <p className="empty-subtext">When you follow someone, they'll appear here</p>
      </div>
    );
  }

  return (
    <div className="following-list" role="list" aria-label="Following list">
      {following.map((follow: Following) => {
        // Convert AuthUser to UserProfile
        const userProfile = toUserProfile(follow.following);
        
        return (
          <UserCard
            key={follow.id}
            user={userProfile}
            size="md"
            showFollowButton
            showStats={false}
            currentUserId={currentUser?.id}
          />
        );
      })}
      
      {hasNextPage && (
        <div className="load-more-container">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="load-more-btn"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}