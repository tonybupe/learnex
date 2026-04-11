// features/users/components/UserProfile.tsx

import { useState } from 'react'

import { UserAvatar } from './UserAvatar'
import { FollowButton } from '@/features/social/components/FollowButton'
import { FollowersList } from '@/features/social/components/FollowersList'
import { FollowingList } from '@/features/social/components/FollowingList'

import { useFollow } from '@/features/social/hooks/useFollow'

import EditProfileModal from './EditProfileModal'
import EditAccountModal from './EditAccountModal'

import type { UserProfile as UserProfileType } from '@/types/api'

import '../users.css'

/* ---------------------------------------
   TYPES
--------------------------------------- */

type TabType = 'posts' | 'followers' | 'following' | 'classes'

interface Props {
  user: UserProfileType
  isOwnProfile: boolean
}

/* ---------------------------------------
   COMPONENT
--------------------------------------- */

export function UserProfile({ user, isOwnProfile }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('posts')

  const [isProfileModalOpen, setProfileModalOpen] = useState(false)
  const [isAccountModalOpen, setAccountModalOpen] = useState(false)

  const { stats } = useFollow(user.id)

  /* ---------------------------------------
     SAFE DATA EXTRACTION
  --------------------------------------- */

  const displayName = user.full_name || 'User'
  const avatarUrl = user.profile?.avatar || null

  const bio = user.profile?.bio || 'No bio yet'
  const location = user.profile?.location
  const profession = user.profile?.profession

  /* ---------------------------------------
     HELPERS
  --------------------------------------- */

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently'
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return 'Recently'
    }
  }

  /* ---------------------------------------
     UI
  --------------------------------------- */

  return (
    <>
      <div className="user-profile">

        {/* COVER */}
        <div className="profile-cover">
          <div className="profile-cover-gradient" />
        </div>

        {/* HEADER */}
        <div className="profile-header">

          <UserAvatar
            src={avatarUrl}
            name={displayName}
            size="xl"
            editable={isOwnProfile}
          />

          <div className="profile-header-info">

            {/* NAME */}
            <div className="profile-name-section">
              <h1 className="profile-name">{displayName}</h1>

              <span className="profile-role">{user.role}</span>

              {user.is_verified && (
                <span className="verified-badge" title="Verified">
                  ✓
                </span>
              )}
            </div>

            {/* BIO */}
            <p className="profile-bio">{bio}</p>

            {/* META */}
            <div className="profile-meta">

              {location && <span>📍 {location}</span>}
              {profession && <span>💼 {profession}</span>}

              {user.phone_number && (
                <span>📞 {user.phone_number}</span>
              )}

              {user.sex && (
                <span>⚥ {user.sex}</span>
              )}

              <span>
                Joined {formatDate(user.created_at)}
              </span>
            </div>

            {/* STATS */}
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="stat-number">
                  {stats?.followers_count ?? user.followers_count ?? 0}
                </span>
                <span className="stat-label">Followers</span>
              </div>

              <div className="profile-stat">
                <span className="stat-number">
                  {stats?.following_count ?? user.following_count ?? 0}
                </span>
                <span className="stat-label">Following</span>
              </div>
            </div>

          </div>

          {/* ACTIONS */}
          <div className="profile-actions">

            {isOwnProfile ? (
              <div className="profile-action-group">

                <button
                  className="btn btn-secondary"
                  onClick={() => setAccountModalOpen(true)}
                >
                  Edit Account
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => setProfileModalOpen(true)}
                >
                  Edit Profile
                </button>

              </div>
            ) : (
              <FollowButton userId={user.id} size="lg" />
            )}

          </div>

        </div>

        {/* TABS */}
        <div className="profile-tabs">

          {['posts', 'followers', 'following', 'classes'].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab as TabType)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}

        </div>

        {/* CONTENT */}
        <div className="profile-tab-content">

          {activeTab === 'posts' && (
            <div className="posts-grid">
              <p className="text-muted">No posts yet</p>
            </div>
          )}

          {activeTab === 'followers' && (
            <FollowersList userId={user.id} />
          )}

          {activeTab === 'following' && (
            <FollowingList userId={user.id} />
          )}

          {activeTab === 'classes' && (
            <div className="classes-grid">
              <p className="text-muted">No classes yet</p>
            </div>
          )}

        </div>

      </div>

      {/* MODALS */}

      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentData={user.profile?? undefined}
      />

      <EditAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        currentData={{
          full_name: user.full_name,
          phone_number: user.phone_number,
          sex: user.sex,
        }}
      />
    </>
  )
}