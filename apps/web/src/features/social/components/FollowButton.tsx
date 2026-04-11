import { useFollow } from '../hooks/useFollow';

interface FollowButtonProps {
  userId: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FollowButton({ userId, size = 'md', className = '' }: FollowButtonProps) {
  const { isFollowing, follow, unfollow, isFollowLoading } = useFollow(userId);

  const handleClick = () => {
    if (isFollowing) {
      unfollow();
    } else {
      follow();
    }
  };

  const sizeClass = `follow-btn-${size}`;

  return (
    <button
      onClick={handleClick}
      disabled={isFollowLoading}
      className={`follow-btn ${sizeClass} ${isFollowing ? 'following' : ''} ${className}`}
      aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
    >
      {isFollowLoading ? (
        <span className="follow-btn-spinner" />
      ) : isFollowing ? (
        <>
          <span className="follow-btn-icon">✓</span>
          <span>Following</span>
        </>
      ) : (
        <>
          <span className="follow-btn-icon">+</span>
          <span>Follow</span>
        </>
      )}
    </button>
  );
}