import { useAuthStore } from "@/features/auth/auth.store"

export default function TeacherDashboardHeader() {

  const user = useAuthStore((s) => s.user)

  const firstName = user?.full_name?.split(" ")[0] ?? "Teacher"

  return (

    <div className="dashboard-header">

      <div>

        <h1 className="dashboard-title">
          Welcome back, {firstName}
        </h1>

        <p className="dashboard-sub">
          Manage your classes, lessons, and student engagement.
        </p>

      </div>

    </div>

  )

}