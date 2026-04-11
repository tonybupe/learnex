import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'

import { useAuth } from '@/features/auth/useAuth'
import { useUser } from '../hooks/useUser'

import { UserProfile } from '../components/UserProfile'
import AppShell from '@/components/layout/AppShell'

import type { UserProfile as UserProfileType } from '@/types/api'

import "@/features/users/users.css"
import "@/features/social/social.css"

export default function ProfilePage() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()

  /* ---------------------------------------
     SAFE USER ID PARSING
  --------------------------------------- */

  const parsedUserId = useMemo(() => {
    if (!userId) return null

    const id = Number(userId)
    return isNaN(id) ? null : id
  }, [userId])

  /* ---------------------------------------
     DETERMINE PROFILE TYPE
  --------------------------------------- */

  const isOwnProfileRoute =
    parsedUserId !== null &&
    currentUser &&
    parsedUserId === currentUser.id

  /* ---------------------------------------
     FETCH USER (ONLY IF NOT OWN PROFILE)
  --------------------------------------- */

  const {
    data: profileUser,
    isLoading,
    error,
  } = useUser(isOwnProfileRoute ? null : parsedUserId)

  /* ---------------------------------------
     NORMALIZE USER → ALWAYS UserProfile
  --------------------------------------- */

  const finalUser: UserProfileType | null = useMemo(() => {
    // ✅ Own profile → map AuthUser → UserProfile
    if (isOwnProfileRoute && currentUser) {
      return {
        ...currentUser,
        followers_count: 0,        // placeholder (API can later provide)
        following_count: 0,
        profile: currentUser.profile ?? null,
      }
    }

    // ✅ Other users → already UserProfile
    return profileUser ?? null
  }, [isOwnProfileRoute, currentUser, profileUser])

  /* ---------------------------------------
     HANDLERS
  --------------------------------------- */

  const handleEditProfile = () => {
    navigate('/settings')
  }

  /* ---------------------------------------
     LOADING
  --------------------------------------- */

  if (isLoading && !isOwnProfileRoute) {
    return (
      <AppShell>
        <div className="profile-loading">
          <div className="profile-cover-skeleton" />
          <div className="profile-header-skeleton" />
          <div className="profile-tabs-skeleton" />
        </div>
      </AppShell>
    )
  }

  /* ---------------------------------------
     INVALID ID
  --------------------------------------- */

  if (!parsedUserId) {
    return (
      <AppShell>
        <div className="profile-error">
          <h2>Invalid profile</h2>
          <p>The profile URL is not valid.</p>
        </div>
      </AppShell>
    )
  }

  /* ---------------------------------------
     NOT FOUND
  --------------------------------------- */

  if (!finalUser) {
    return (
      <AppShell>
        <div className="profile-error">
          <h2>User not found</h2>
          <p>The profile you're looking for doesn't exist.</p>
        </div>
      </AppShell>
    )
  }

  /* ---------------------------------------
     OWN PROFILE CHECK
  --------------------------------------- */

  const isOwnProfile =
    currentUser?.id === finalUser.id

  /* ---------------------------------------
     UI
  --------------------------------------- */

  return (
    <AppShell>
      <UserProfile
        user={finalUser}
        isOwnProfile={isOwnProfile}
      />
    </AppShell>
  )
}