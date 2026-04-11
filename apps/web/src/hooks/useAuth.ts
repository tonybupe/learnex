import { useAuthStore } from "@/features/auth/auth.store";

export function useAuth() {
  return useAuthStore();
}