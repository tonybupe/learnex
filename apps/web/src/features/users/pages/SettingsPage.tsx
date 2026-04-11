import { useState, useMemo } from "react"

import { useAuth } from "@/features/auth/useAuth"
import {
  useCurrentUser,
  useUploadAvatar,
} from "../hooks/useUser"

import AppShell from "@/components/layout/AppShell"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"

import { UserAvatar } from "../components/UserAvatar"
import EditProfileModal from "../components/EditProfileModal"
import DeleteAccountModal from "../components/DeleteAccountModal"

import "@/features/users/users.css"

/* ---------------------------------------
   TYPES
--------------------------------------- */

type FeedbackState = {
  success?: string
  error?: string
}

/* ---------------------------------------
   COMPONENT
--------------------------------------- */

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: currentUser, refetch } = useCurrentUser()

  const uploadAvatar = useUploadAvatar()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const [feedback, setFeedback] = useState<FeedbackState>({})

  /* ---------------------------------------
     USER SOURCE
  --------------------------------------- */

  const displayUser = useMemo(() => {
    return currentUser ?? user
  }, [currentUser, user])

  const profile = displayUser?.profile ?? undefined

  /* ---------------------------------------
     PROFILE COMPLETENESS (PRO UX)
  --------------------------------------- */

  const profileCompletion = useMemo(() => {
    if (!displayUser) return 0

    const checks = [
      displayUser.full_name,
      displayUser.email,
      displayUser.phone_number,
      displayUser.sex,
      profile?.bio,
      profile?.location,
      profile?.country,
      profile?.profession,
      profile?.organization,
      profile?.website,
    ]

    const filled = checks.filter(Boolean).length
    return Math.round((filled / checks.length) * 100)
  }, [displayUser, profile])

  /* ---------------------------------------
     HELPERS
  --------------------------------------- */

  const setSuccess = (msg: string) => {
    setFeedback({ success: msg })
    setTimeout(() => setFeedback({}), 3000)
  }

  const setError = (msg: string) => {
    setFeedback({ error: msg })
  }

  const formatDate = (date?: string) => {
    if (!date) return "N/A"
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  /* ---------------------------------------
     ACTIONS
  --------------------------------------- */

  const handleAvatarUpload = async (file: File) => {
    try {
      setFeedback({})
      await uploadAvatar.mutateAsync(file)
      await refetch()
      setSuccess("Avatar updated successfully")
    } catch (err) {
      console.error(err)
      setError("Failed to upload avatar")
    }
  }

  /* ---------------------------------------
     GUARD
  --------------------------------------- */

  if (!displayUser) {
    return (
      <AppShell>
        <div className="profile-loading" />
      </AppShell>
    )
  }

  /* ---------------------------------------
     UI
  --------------------------------------- */

  return (
    <AppShell>
      <div className="settings-page">

        {/* HEADER */}
        <div className="settings-header">
          <h1>Settings</h1>
          <p className="settings-sub">
            Manage your account and profile
          </p>
        </div>

        <div className="settings-layout">

          {/* SIDEBAR (SCALABLE) */}
          <div className="settings-sidebar">
            <button className="settings-tab active">
              Profile
            </button>
          </div>

          {/* CONTENT */}
          <div className="settings-content">

            {/* FEEDBACK */}
            {feedback.success && (
              <div className="success-message">{feedback.success}</div>
            )}
            {feedback.error && (
              <div className="error-message">{feedback.error}</div>
            )}

            {/* =======================
                PROFILE COMPLETION
            ======================= */}
            <Card>
              <div className="profile-completion">
                <div className="completion-header">
                  <h3>Profile Strength</h3>
                  <span>{profileCompletion}%</span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>

                <p className="completion-hint">
                  Complete your profile to improve visibility and engagement.
                </p>
              </div>
            </Card>

            {/* =======================
                PROFILE OVERVIEW
            ======================= */}
            <Card style={{ marginTop: 20 }}>
              <div className="profile-overview">

                <div className="profile-overview-header">
                  <h2>Profile Overview</h2>

                  <Button
                    onClick={() => setIsEditModalOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    Edit Profile
                  </Button>
                </div>

                <div className="profile-overview-content">

                  <UserAvatar
                    src={profile?.avatar ?? undefined}
                    name={displayUser.full_name}
                    size="xl"
                    editable
                    onUpload={handleAvatarUpload}
                  />

                  <div className="profile-info-summary">

                    <div className="info-row">
                      <span className="info-label">Full Name</span>
                      <span className="info-value">
                        {displayUser.full_name || "Not set"}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Email</span>
                      <span className="info-value">
                        {displayUser.email || "N/A"}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Phone</span>
                      <span className="info-value">
                        {displayUser.phone_number || "—"}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Sex</span>
                      <span className="info-value">
                        {displayUser.sex || "—"}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Bio</span>
                      <span className="info-value">
                        {profile?.bio || "No bio yet"}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            </Card>

            {/* =======================
                ACCOUNT INFO
            ======================= */}
            <Card style={{ marginTop: 20 }}>
              <h2>Account Information</h2>

              <div className="account-info">

                <div className="info-row">
                  <span className="info-label">Role</span>
                  <span className="role-badge">
                    {displayUser.role?.toUpperCase()}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Member since</span>
                  <span className="info-value">
                    {formatDate(displayUser.created_at)}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Verified</span>
                  <span className="info-value">
                    {displayUser.is_verified ? "Yes" : "No"}
                  </span>
                </div>

              </div>
            </Card>

            {/* =======================
                DANGER ZONE
            ======================= */}
            <Card
              style={{
                marginTop: 20,
                borderColor: "var(--danger)",
              }}
            >
              <h2 style={{ color: "var(--danger)" }}>
                Danger Zone
              </h2>

              <div className="danger-zone">

                <div className="danger-item">
                  <div>
                    <h3>Delete Account</h3>
                    <p>Permanently remove your account and data</p>
                  </div>

                  <Button
                    variant="danger"
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    Delete Account
                  </Button>
                </div>

              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* MODALS */}

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentData={profile}
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        userId={displayUser.id}
      />
    </AppShell>
  )
}