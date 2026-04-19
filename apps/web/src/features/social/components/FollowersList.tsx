// features/social/components/FollowersList.tsx
import { useFollowers } from '../hooks/useFollow';
import { UserCard } from '@/features/users/components/UserCard';
import { useAuth } from '@/features/auth/useAuth';
import type { Follower, UserProfile } from '@/types/api';

interface FollowersListProps {
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

export function FollowersList({ userId }: FollowersListProps) {
  const { user: currentUser } = useAuth();
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    error 
  } = useFollowers(userId);

  if (isLoading) {
    return (
      <div className="followers-loading" aria-label="Loading followers">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="follower-skeleton" role="status" aria-label="Loading..." />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="followers-error" role="alert">
        <p className="error-text">Failed to load followers</p>
        <button 
          onClick={() => fetchNextPage()} 
          className="retry-btn"
          aria-label="Retry loading followers"
        >
          Retry
        </button>
      </div>
    );
  }

  const followers = Array.isArray(data) ? data : ((data as any)?.items ?? []) ?? [];

  if (followers.length === 0) {
    return (
      <div className="followers-empty" role="status">
        <div className="empty-icon">👥</div>
        <p className="empty-text">No followers yet</p>
        <p className="empty-subtext">When someone follows you, they'll appear here</p>
      </div>
    );
  }

  return (
    <div className="followers-list" role="list" aria-label="Followers list">
      {followers.map((follower: Follower) => {
        // Convert AuthUser to UserProfile
        const userProfile = toUserProfile(follower.follower);
        
        return (
          <UserCard
            key={follower.id}
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
            aria-label={isFetchingNextPage ? 'Loading more followers...' : 'Load more followers'}
          >
            {isFetchingNextPage ? (
              <>
                <span className="spinner-small" aria-hidden="true" />
                <span>Loading...</span>
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}