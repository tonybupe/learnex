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
import SubscriptionPage from "@/pages/subscription/SubscriptionPage"

// Shared
import MessagingPage from "@/pages/shared/MessagingPage"
import UnauthorizedPage from "@/pages/shared/UnauthorizedPage"
import NotFoundPage from "@/pages/shared/NotFoundPage"
import FeedPage from "@/pages/shared/FeedSection"

// Features
import ProfilePage from "@/features/users/pages/ProfilePage"
import SettingsPage from "@/features/users/pages/SettingsPage"
import ClassesPage from "@/pages/classes/ClassesPage"
import DiscoverClassesPage from "@/pages/classes/DiscoverClassesPage"
import SubjectsPage from "@/pages/subjects/SubjectsPage"
import LessonsPage from "@/pages/lessons/LessonsPage"
import QuizzesPage from "@/pages/quizzes/QuizzesPage"
import LiveSessionsPage from "@/pages/live-sessions/LiveSessionsPage"
import DiscoverPage from "@/pages/discover/DiscoverPage"
import MessagesPage from "@/pages/messages/MessagesPage"
import AnalyticsPage from "@/pages/analytics/AnalyticsPage"

const ALL_ROLES = ["admin", "teacher", "learner"] as const

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (!user?.role) return <Navigate to="/auth/login" replace />
  const routes = { admin: "/admin/dashboard", teacher: "/teacher/dashboard", learner: "/learner/dashboard" }
  return <Navigate to={routes[user.role]} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route path="/admin/dashboard" element={<AuthGuard allowedRoles={["admin"]}><AdminDashboardPage /></AuthGuard>} />
        <Route path="/teacher/dashboard" element={<AuthGuard allowedRoles={["teacher"]}><TeacherDashboardPage /></AuthGuard>} />
        <Route path="/learner/dashboard" element={<AuthGuard allowedRoles={["learner"]}><LearnerDashboardPage /></AuthGuard>} />

        <Route path="/feed" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><FeedPage /></AuthGuard>} />
        <Route path="/messages" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><MessagingPage /></AuthGuard>} />
        <Route path="/classes" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><ClassesPage /></AuthGuard>} />
        <Route path="/classes/discover" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><DiscoverClassesPage /></AuthGuard>} />
        <Route path="/subjects" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><SubjectsPage /></AuthGuard>} />
        <Route path="/lessons" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><LessonsPage /></AuthGuard>} />
        <Route path="/quizzes" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><QuizzesPage /></AuthGuard>} />
        <Route path="/live-sessions" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><LiveSessionsPage /></AuthGuard>} />
        <Route path="/messages" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><MessagesPage /></AuthGuard>} />
        <Route path="/analytics" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><AnalyticsPage /></AuthGuard>} />
        <Route path="/discover" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><DiscoverPage /></AuthGuard>} />
        <Route path="/profile/:userId" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><ProfilePage /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><SettingsPage /></AuthGuard>} />

        <Route path="/subscription" element={<AuthGuard allowedRoles={[...ALL_ROLES]}><SubscriptionPage /></AuthGuard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </QueryClientProvider>
  )
}