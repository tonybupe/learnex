// features/auth/auth.store.ts

import { queryClient } from "@/lib/queryClient"
import { create } from "zustand"

import { persist, createJSONStorage } from "zustand/middleware"

import type { AuthUser } from "@/types/api"

/* =======================================
   STATE TYPE
======================================= */

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  /* ACTIONS */
  setSession: (token: string, user: AuthUser) => void
  setUser: (user: AuthUser) => void
  updateUser: (user: Partial<AuthUser>) => void
  clearSession: () => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

/* =======================================
   STORE
======================================= */

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({

      /* -------------------------------------
         STATE
      ------------------------------------- */
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      /* -------------------------------------
         SET SESSION (LOGIN)
      ------------------------------------- */
      setSession: (token, user) => {
        set({
          accessToken: token,
          user,
          isAuthenticated: true,
          isLoading: false,
        })

        // 🔐 optional: keep token for axios fallback
        localStorage.setItem("learnex_access_token", token)
      },

      /* -------------------------------------
         🔥 FULL USER REPLACEMENT (CRITICAL)
      ------------------------------------- */
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        })
      },

      /* -------------------------------------
         🔥 SAFE USER UPDATE (MERGE)
      ------------------------------------- */
      updateUser: (partialUser) => {
        const currentUser = get().user
        if (!currentUser) return

        const updatedUser: AuthUser = {
          ...currentUser,

          // shallow merge
          ...partialUser,

          // 🔥 SAFE PROFILE MERGE (IMPORTANT)
          profile: {
            ...(currentUser.profile ?? {}),
            ...(partialUser.profile ?? {}),
          },
        }

        set({ user: updatedUser })
      },

      /* -------------------------------------
         CLEAR SESSION
      ------------------------------------- */
      clearSession: () => {
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      /* -------------------------------------
         LOGOUT
      ------------------------------------- */
      logout: () => {
        localStorage.removeItem("learnex_access_token")
        get().clearSession()
      },

      /* -------------------------------------
         LOADING STATE
      ------------------------------------- */
      setLoading: (loading) => {
        set({ isLoading: loading })
      },

    }),
    {
      name: "auth-storage",

      storage: createJSONStorage(() => localStorage),

      /* -------------------------------------
         PERSIST ONLY WHAT MATTERS
      ------------------------------------- */
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)