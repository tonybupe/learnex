// features/users/api/users.api.ts

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type {
  AuthUser,
  UserProfile,
  UserProfileDetails,
  DeleteAccountResponse,
  UpdateUserProfileData,
} from "@/types/api"

/* =======================================
   CURRENT USER
======================================= */

/**
 * GET /users/me
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>(
    endpoints.users.me
  )
  return data
}

/* =======================================
   PROFILE (CURRENT USER)
======================================= */

/**
 * GET /users/me/profile
 */
export async function getMyProfile(): Promise<UserProfileDetails | null> {
  const { data } = await api.get<UserProfileDetails | null>(
    endpoints.users.myProfile
  )
  return data
}

/**
 * PATCH /users/me/profile
 */
export async function updateUserProfile(
  data: UpdateUserProfileData
): Promise<UserProfileDetails> {
  const { data: res } = await api.patch<UserProfileDetails>(
    endpoints.users.updateMyProfile,
    data
  )
  return res
}

/* =======================================
   PUBLIC USER
======================================= */

/**
 * GET /users/{id}
 */
export async function getUserById(
  userId: number
): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(
    endpoints.users.byId(userId)
  )
  return data
}

/* =======================================
   ACCOUNT (OPTIONAL - IF BACKEND SUPPORTS)
======================================= */

/**
 * DELETE /users/me
 */
export async function deleteMyAccount(): Promise<DeleteAccountResponse> {
  const { data } = await api.delete<DeleteAccountResponse>(
    endpoints.users.me
  )
  return data
}

/* =======================================
   MEDIA
======================================= */

/**
 * Upload avatar
 */
export async function uploadAvatar(
  file: File
): Promise<{ avatar_url: string }> {
  const formData = new FormData()
  formData.append("file", file)

  const { data } = await api.post(
    endpoints.media.upload,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  )

  return data
}

/* =======================================
   SEARCH
======================================= */

/**
 * Search users
 */
export async function searchUsers(
  query: string,
  limit = 10
): Promise<AuthUser[]> {
  const { data } = await api.get<AuthUser[]>(
    endpoints.search.users,
    {
      params: { q: query, limit },
    }
  )

  return data
}