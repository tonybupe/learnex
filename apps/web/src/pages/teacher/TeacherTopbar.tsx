import { LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth.store"

export default function TeacherTopbar() {

  const navigate = useNavigate()
  const clearSession = useAuthStore((s) => s.clearSession)

  const logout = () => {

    localStorage.removeItem("learnex_access_token")

    clearSession()

    navigate("/auth/login", { replace: true })

  }

  return (

    <div className="flex items-center justify-between border-b pb-4">

      <h2 className="text-xl font-semibold text-slate-900">
        Teacher Workspace
      </h2>

      <button
        onClick={logout}
        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
      >
        <LogOut size={16} />
        Logout
      </button>

    </div>

  )

}