// features/users/hooks/useUser.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"

import * as userApi from "../api/users.api"

import type {
  AuthUser,
  UserProfile,
  DeleteAccountResponse,
  UpdateUserProfileData,
  UserProfileDetails,
} from "@/types/api"

/* =======================================
   QUERY KEYS (ENTERPRISE STRUCTURE)
======================================= */

export const userKeys = {
  all: ["users"] as const,

  me: () => [...userKeys.all, "me"] as const,
  myProfile: () => [...userKeys.all, "me", "profile"] as const,

  byId: (id: number) => [...userKeys.all, "byId", id] as const,

  search: (query: string) =>
    [...userKeys.all, "search", query] as const,
}

/* =======================================
   GET CURRENT USER
======================================= */

export function useCurrentUser() {
  return useQuery<AuthUser>({
    queryKey: userKeys.me(),
    queryFn: userApi.getCurrentUser,
    staleTime: 5 * 60 * 1000,
  })
}

/* =======================================
   GET MY PROFILE
======================================= */

export function useMyProfile() {
  return useQuery<UserProfileDetails | null>({
    queryKey: userKeys.myProfile(),
    queryFn: userApi.getMyProfile,
    staleTime: 5 * 60 * 1000,
  })
}

/* =======================================
   GET USER BY ID (PUBLIC PROFILE)
======================================= */

export function useUser(userId: number | null) {
  return useQuery<UserProfile>({
    queryKey: userKeys.byId(userId!),
    queryFn: () => userApi.getUserById(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

/* =======================================
   UPDATE PROFILE (🔥 FIXED VERSION)
======================================= */

export function useUpdateUserProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserProfileData) =>
      userApi.updateUserProfile(data),

    onSuccess: (updatedProfile) => {
      /* -------------------------------------
         1. 🔥 UPDATE ZUSTAND STORE (CRITICAL FIX)
      ------------------------------------- */
      const store = useAuthStore.getState()

      if (store.user) {
        store.setUser({
          ...store.user,
          profile: updatedProfile,
        })
      }

      /* -------------------------------------
         2. ⚡ INSTANT UI UPDATE (NO REFETCH NEEDED)
      ------------------------------------- */
      queryClient.setQueryData(
        userKeys.myProfile(),
        updatedProfile
      )

      /* -------------------------------------
         3. 🔄 KEEP SYSTEM CONSISTENT
      ------------------------------------- */
      queryClient.invalidateQueries({
        queryKey: userKeys.me(),
      })

      queryClient.invalidateQueries({
        queryKey: userKeys.all,
      })
    },
  })
}

/* =======================================
   UPLOAD AVATAR
======================================= */

export function useUploadAvatar() {
  const qc = useQueryClient()
  const store = useAuthStore.getState()

  return useMutation({
    mutationFn: userApi.uploadAvatar,

    onSuccess: (data) => {
      // 🔥 Update store instantly
      if (store.user) {
        store.setUser({
          ...store.user,
          profile: {
            ...store.user.profile,
            avatar_url: data.avatar_url,
          },
        })
      }

      // 🔄 Sync queries
      qc.invalidateQueries({ queryKey: userKeys.myProfile() })
      qc.invalidateQueries({ queryKey: userKeys.me() })
    },
  })
}

/* =======================================
   DELETE ACCOUNT
======================================= */

export function useDeleteUserAccount() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { logout } = useAuth()

  return useMutation<DeleteAccountResponse, Error>({
    mutationFn: userApi.deleteMyAccount,

    onSuccess: () => {
      qc.clear()
      logout()
      navigate("/auth/login", { replace: true })
    },
  })
}

/* =======================================
   SEARCH USERS
======================================= */

export function useSearchUsers(query: string) {
  return useQuery<AuthUser[]>({
    queryKey: userKeys.search(query),
    queryFn: () => userApi.searchUsers(query),
    enabled: query.length > 2,
    staleTime: 2 * 60 * 1000,
  })
}