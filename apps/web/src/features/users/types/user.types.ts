// types/api.ts

/* ---------------------------------------
   BASE USER (CORE IDENTITY)
--------------------------------------- */

export interface BaseUser {
  id: number
  full_name: string
  email: string

  phone_number?: string | null
  sex?: 'male' | 'female' | 'other' | null

  role: 'admin' | 'teacher' | 'learner'

  is_active: boolean
  is_verified: boolean

  created_at?: string
  updated_at?: string
}

/* ---------------------------------------
   USER PROFILE (EXTENDED DATA)
--------------------------------------- */

export interface UserProfileDetails {
  avatar_url?: string | null
  bio?: string | null

  date_of_birth?: string | null
  location?: string | null
  country?: string | null

  profession?: string | null
  organization?: string | null
  website?: string | null

  skills?: Record<string, any> | null
  interests?: Record<string, any> | null
  social_links?: Record<string, any> | null
}

/* ---------------------------------------
   FULL USER PROFILE (PUBLIC VIEW)
--------------------------------------- */

export interface UserProfile extends BaseUser {
  followers_count?: number
  following_count?: number

  profile?: UserProfileDetails | null
}

/* ---------------------------------------
   AUTH USER (CURRENT USER)
--------------------------------------- */

export interface AuthUser extends BaseUser {
  // optional profile (depends on backend response)
  profile?: UserProfileDetails | null

  access_token?: string
}

/* ---------------------------------------
   UPDATE ACCOUNT (USER)
--------------------------------------- */

export interface UpdateUserData {
  full_name?: string
  phone_number?: string | null
  sex?: 'male' | 'female' | 'other' | null
}

/* ---------------------------------------
   UPDATE PROFILE (PROFILE MODEL)
--------------------------------------- */

export interface UpdateUserProfileData {
  avatar_url?: string | null
  bio?: string | null

  date_of_birth?: string | null
  location?: string | null
  country?: string | null

  profession?: string | null
  organization?: string | null
  website?: string | null

  skills?: Record<string, any> | null
  interests?: Record<string, any> | null
  social_links?: Record<string, any> | null
}

/* ---------------------------------------
   DELETE RESPONSE
--------------------------------------- */

export interface DeleteAccountResponse {
  message: string
}