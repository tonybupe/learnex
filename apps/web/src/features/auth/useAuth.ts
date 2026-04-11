// features/auth/useAuth.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./auth.store";
import { login as loginApi, register as registerApi, getMe } from "./auth.api";
import type { LoginCredentials, RegisterData } from "./auth.api";

export function useAuth() {
  const navigate = useNavigate();
  const { 
    accessToken, 
    user, 
    isAuthenticated, 
    isLoading,
    setSession, 
    clearSession,
    setLoading 
  } = useAuthStore();

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (accessToken && !user && !isLoading) {
        setLoading(true);
        try {
          const userData = await getMe();
          setSession(accessToken, userData);
        } catch (error) {
          console.error("Failed to load user:", error);
          clearSession();
          localStorage.removeItem("learnex_access_token");
        } finally {
          setLoading(false);
        }
      }
    };

    loadUser();
  }, [accessToken, user, isLoading, setSession, clearSession, setLoading]);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const response = await loginApi(credentials);
      const { access_token } = response;
      
      localStorage.setItem("learnex_access_token", access_token);
      
      const userData = await getMe();
      
      setSession(access_token, userData);
      
      const routes = {
        admin: "/admin/dashboard",
        teacher: "/teacher/dashboard",
        learner: "/learner/dashboard",
      };
      navigate(routes[userData.role] || "/");
      
      return { success: true };
    } catch (error) {
      clearSession();
      localStorage.removeItem("learnex_access_token");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      const response = await registerApi(data);
      const { access_token, user } = response;
      
      localStorage.setItem("learnex_access_token", access_token);
      setSession(access_token, user);
      
      const routes = {
        admin: "/admin/dashboard",
        teacher: "/teacher/dashboard",
        learner: "/learner/dashboard",
      };
      navigate(routes[user.role] || "/");
      
      return { success: true };
    } catch (error) {
      clearSession();
      localStorage.removeItem("learnex_access_token");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("learnex_access_token");
    clearSession();
    navigate("/auth/login");
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    isAdmin: isAuthenticated && user?.role === 'admin',
    isTeacher: isAuthenticated && user?.role === 'teacher',
    isLearner: isAuthenticated && user?.role === 'learner',
    role: user?.role,
  };
}

// Export auth keys for query invalidation if needed
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};