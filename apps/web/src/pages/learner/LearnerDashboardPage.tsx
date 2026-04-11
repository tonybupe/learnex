import AppShell from "@/components/layout/AppShell"
import { useAuthStore } from "@/features/auth/auth.store"

import FeedSection from "@/pages/shared/FeedSection"

/* New Components */
import LearnerDashboardHeader from "./LearnerDashboardHeader"
import LearnerQuickActions from "./LearnerQuickActions"
import LearnerUpcoming from "./LearnerUpcoming"
import LearnerActivity from "./LearnerActivity"

export default function LearnerDashboardPage() {

  const user = useAuthStore((s) => s.user)

  return (

    <AppShell>

      <div className="dashboard-stack">

        {/* HEADER */}
        <LearnerDashboardHeader />

        {/* QUICK ACTIONS */}
        <LearnerQuickActions />

         {/* SIDEBAR */}
          <div className="dashboard-sidebar">

            <LearnerUpcoming />

            <LearnerActivity />

          </div>

        {/* MAIN GRID */}
        <div className="dashboard-grid">

          {/* MAIN CONTENT */}
          <div className="dashboard-main">

            {/* FEED */}
            <div className="card">

              <div className="card-head">
                <span className="card-title">Class Feed</span>
              </div>

              <FeedSection />

            </div>

          </div>

        

        </div>

      </div>

    </AppShell>

  )

}