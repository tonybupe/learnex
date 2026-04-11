// features/auth/AuthGuard.tsx (simplified)
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: Array<'admin' | 'teacher' | 'learner'>;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  allowedRoles,
  redirectTo = "/auth/login"
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "100vh" 
      }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}