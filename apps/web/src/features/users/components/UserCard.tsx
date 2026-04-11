import { Link } from 'react-router-dom';
import { UserAvatar } from './UserAvatar';
import { FollowButton } from '@/features/social/components/FollowButton';
import type { UserProfile } from '../types/user.types';

interface UserCardProps {
  user: UserProfile;
  showFollowButton?: boolean;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
  currentUserId?: number;
}

export function UserCard({ 
  user, 
  showFollowButton = true, 
  showStats = false,
  size = 'md',
  currentUserId 
}: UserCardProps) {
  const isCurrentUser = currentUserId === user.id;

  return (
    <div className={`user-card user-card-${size}`}>
      <Link to={`/profile/${user.id}`} className="user-card-link">
        <UserAvatar 
          src={user.avatar_url} 
          name={user.name} 
          size={size === 'lg' ? 'xl' : size} 
        />
        
        <div className="user-card-info">
          <h3 className="user-card-name">{user.name}</h3>
          <p className="user-card-role">{user.role}</p>
          {user.bio && size === 'lg' && (
            <p className="user-card-bio">{user.bio}</p>
          )}
        </div>
      </Link>

      {showStats && (
        <div className="user-card-stats">
          <div className="stat">
            <span className="stat-value">{user.followers_count}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.following_count}</span>
            <span className="stat-label">Following</span>
          </div>
        </div>
      )}

      {showFollowButton && !isCurrentUser && (
        <FollowButton 
          userId={user.id} 
          size={size === 'sm' ? 'sm' : 'md'}
        />
      )}
    </div>
  );
}