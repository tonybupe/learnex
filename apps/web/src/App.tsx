import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuth } from "@/features/auth/useAuth";

// Import your pages
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import TeacherDashboardPage from "@/pages/teacher/TeacherDashboardPage";
import LearnerDashboardPage from "@/pages/learner/LearnerDashboardPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import MessagingPage from "@/pages/shared/MessagingPage";
import UnauthorizedPage from "@/pages/shared/UnauthorizedPage";
import NotFoundPage from "@/pages/shared/NotFoundPage";
import ProfilePage from "@/features/users/pages/ProfilePage"
import SettingsPage from "@/features/users/pages/SettingsPage"

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  
  // Ensure user and role exist before using
  if (!user || !user.role) {
    return <Navigate to="/auth/login" replace />;
  }
  
  const routes = {
    admin: "/admin/dashboard",
    teacher: "/teacher/dashboard",
    learner: "/learner/dashboard",
  };
  
  // Now user.role is guaranteed to exist
  return <Navigate to={routes[user.role]} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        <Route path="/admin/dashboard" element={
          <AuthGuard allowedRoles={["admin"]}>
            <AdminDashboardPage />
          </AuthGuard>
        } />
        
        <Route path="/teacher/dashboard" element={
          <AuthGuard allowedRoles={["teacher"]}>
            <TeacherDashboardPage />
          </AuthGuard>
        } />
        
        <Route path="/learner/dashboard" element={
          <AuthGuard allowedRoles={["learner"]}>
            <LearnerDashboardPage />
          </AuthGuard>
        } />
        
        <Route path="/messages" element={
          <AuthGuard allowedRoles={["admin", "teacher", "learner"]}>
            <MessagingPage />
          </AuthGuard>
        } />

        <Route path="/profile/:userId" element={
          <AuthGuard allowedRoles={["admin", "teacher", "learner"]}>
            <ProfilePage />
          </AuthGuard>
        } />

        <Route path="/settings" element={
          <AuthGuard allowedRoles={["admin", "teacher", "learner"]}>
            <SettingsPage />
          </AuthGuard>
        } />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </QueryClientProvider>
  );
}