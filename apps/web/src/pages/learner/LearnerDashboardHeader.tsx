import { useAuthStore } from "@/features/auth/auth.store"

export default function LearnerDashboardHeader() {

  const user = useAuthStore((s) => s.user)

  const firstName = user?.full_name?.split(" ")[0] ?? "Learner"

  return (
    <div className="dashboard-header">

      <div>
        <h1 className="dashboard-title">
          Welcome back, {firstName}
        </h1>

        <p className="dashboard-sub">
          Stay updated with your classes, discussions, and assignments.
        </p>
      </div>

    </div>
  )
}