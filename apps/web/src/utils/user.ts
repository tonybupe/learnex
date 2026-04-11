// utils/user.ts
import type { UserMini } from "@/features/posts/types/post.types"
import type { AuthUser } from "@/types/api"

export type AnyUser = AuthUser | UserMini | null | undefined

/**
 * Safely get avatar URL from any user type
 * Handles both AuthUser (from auth store) and UserMini (from post types)
 */
export function getUserAvatar(user: AnyUser): string | null {
  if (!user?.profile) return null
  return user.profile.avatar_url || null
}

/**
 * Get user display name
 */
export function getUserName(user: AnyUser): string {
  return user?.full_name || 'User'
}

/**
 * Get user initials (first letter of name)
 */
export function getUserInitials(user: AnyUser): string {
  const name = getUserName(user)
  return name.charAt(0).toUpperCase()
}

/**
 * Get user role with proper formatting
 */
export function getUserRole(user: AnyUser): string {
  if (!user?.role) return ''
  return user.role.charAt(0).toUpperCase() + user.role.slice(1)
}

/**
 * Get user role badge class
 */
export function getUserRoleBadgeClass(user: AnyUser): string {
  if (!user?.role) return ''
  return `role-badge ${user.role}`
}

/**
 * Check if user can delete a post
 */
export function canDeletePost(user: AnyUser, authorId: number): boolean {
  if (!user) return false
  return user.role === 'admin' || user.id === authorId
}

/**
 * Check if user can delete a comment
 */
export function canDeleteComment(user: AnyUser, authorId: number): boolean {
  if (!user) return false
  return user.role === 'admin' || user.id === authorId
}

/**
 * Check if user can edit content
 */
export function canEditContent(user: AnyUser, authorId: number): boolean {
  if (!user) return false
  return user.role === 'admin' || user.id === authorId
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AnyUser): boolean {
  return user?.role === 'admin'
}

/**
 * Check if user is teacher
 */
export function isTeacher(user: AnyUser): boolean {
  return user?.role === 'teacher'
}

/**
 * Check if user is learner
 */
export function isLearner(user: AnyUser): boolean {
  return user?.role === 'learner'
}

/**
 * Get user profile URL (for navigation)
 */
export function getUserProfileUrl(user: AnyUser): string {
  if (!user?.id) return '/profile'
  return `/profile/${user.id}`
}