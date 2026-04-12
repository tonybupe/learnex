import { Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import AuthGuard from "@/features/auth/AuthGuard"
import { useAuth } from "@/features/auth/useAuth"

// Auth
import LoginPage from "@/pages/auth/LoginPage"
import RegisterPage from "@/pages/auth/RegisterPage"

// Dashboards
import TeacherDashboardPage from "@/pages/teacher/TeacherDashboardPage"
import LearnerDashboardPage from "@/pages/learner/LearnerDashboardPage"
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage"

// Shared
import MessagingPage from "@/pages/shared/MessagingPage"
import UnauthorizedPage from "@/pages/shared/UnauthorizedPage"
import NotFoundPage from "@/pages/shared/NotFoundPage"

// Features
import ProfilePage from "@/features/users/pages/ProfilePage"
import SettingsPage from "@/features/users/pages/SettingsPage"
import ClassesPage from "@/pages/classes/ClassesPage"
import DiscoverClassesPage from "@/pages/classes/DiscoverClassesPage"
import SubjectsPage from "@/pages/subjects/SubjectsPage"
import { FeedSection as FeedPage } from "@/pages/shared/FeedSection"

const ALL_ROLES = ["admin", "teacher", "learner"] as const

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
    </div>
  )

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (!user?.role) return <Navigate to="/auth/login" replace />

  const routes = {
    admin: "/admin/dashboard",
    teacher: "/teacher/dashboard",
    learner: "/learner/dashboard",
  }
  return <Navigate to={routes[user.role]} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <AuthGuard allowedRoles={["admin"]}>
            <AdminDashboardPage />
          </AuthGuard>
        } />

        {/* Teacher */}
        <Route path="/teacher/dashboard" element={
          <AuthGuard allowedRoles={["teacher"]}>
            <TeacherDashboardPage />
          </AuthGuard>
        } />

        {/* Learner */}
        <Route path="/learner/dashboard" element={
          <AuthGuard allowedRoles={["learner"]}>
            <LearnerDashboardPage />
          </AuthGuard>
        } />

        {/* Shared — all roles */}
        <Route path="/feed" element={
          <AuthGuard allowedRoles={[...ALL_ROLES]}>
            <FeedPage />
          </AuthGuard>
        } />

        <Route path="/messages" element={
          <AuthGuard allowedRoles={[...ALL_ROLES]}>
            <MessagingPage />
          </AuthGuard>
        } />

        <Route path="/classes" element={
          <AuthGuard allowedRoles={[...ALL_ROLES]}>
            <ClassesPage />
          </AuthGuard>
        } />

        <Route path="/classes/discover" element={
          <AuthGuard allowedRoles={[...ALL_ROLES]}>
            <DiscoverClassesPage />
          </AuthGuard>
        } />

        <Route path="/subjects" element={
          <AuthGuard allowedRoles={[...ALL_ROLES]}>
            <SubjectsPage />
          </AuthGuard>
        } />

        <Route path="/profile/:userId" element={
          <AuthGuard allowedRoles={[...ALL_ROLES]}>
            <ProfilePage />
          </AuthGuard>
        } />

        <Route path="/settings" element={
          <AuthGuard allowedRoles={[...ALL_ROLES]}>
            <SettingsPage />
          </AuthGuard>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </QueryClientProvider>
  )
}