import AppShell from "@/components/layout/AppShell"

import { Users, BookOpen, GraduationCap, Activity } from "lucide-react"

import { useNavigate } from "react-router-dom"

import StatCard from "@/components/layout/StatCard"
import ActivityItem from "@/components/layout/ItemActivity"
import ActionButton from "@/components/layout/ActionButton"

export default function AdminDashboardPage() {

  const navigate = useNavigate()

  return (

    <AppShell>

      <div className="page-section">

        {/* Header */}

        <div className="page-header">

          <h1 className="page-title">
            Admin Dashboard
          </h1>

          <p className="page-sub">
            Manage users, classes, and platform activity.
          </p>

        </div>


        {/* Stats */}

        <div className="grid-4 stats-grid">

          <StatCard
            icon={<Users size={22} />}
            title="Total Users"
            value="1,248"
          />

          <StatCard
            icon={<GraduationCap size={22} />}
            title="Teachers"
            value="84"
          />

          <StatCard
            icon={<BookOpen size={22} />}
            title="Active Classes"
            value="32"
          />

          <StatCard
            icon={<Activity size={22} />}
            title="Platform Activity"
            value="2,431"
          />

        </div>


        {/* Dashboard Content */}

        <div className="grid-3 dashboard-grid">

          {/* Recent Activity */}

          <div className="card span-4">

            <div className="card-header">
              <div className="card-title">
                Recent Activity
              </div>
            </div>

            <div className="activity-list">

              <ActivityItem
                title="New teacher registered"
                description="John Mwansa joined the platform"
                time="5 minutes ago"
              />

              <ActivityItem
                title="New class created"
                description="Grade 11 Computer Science"
                time="20 minutes ago"
              />

              <ActivityItem
                title="Quiz published"
                description="Mathematics Midterm Assessment"
                time="1 hour ago"
              />

            </div>

          </div>


          {/* Quick Actions */}

          <div className="card">

            <div className="card-header">
              <div className="card-title">
                Quick Actions
              </div>
            </div>

            <div className="action-list">

              <ActionButton
                label="Create Class"
                onClick={() => navigate("/classes")}
              />

              <ActionButton
                label="Manage Users"
                onClick={() => navigate("/admin/users")}
              />

              <ActionButton
                label="Create Subject"
                onClick={() => navigate("/subjects")}
              />

              <ActionButton
                label="View Reports"
                onClick={() => navigate("/admin/reports")}
              />

            </div>

          </div>

        </div>

      </div>

    </AppShell>

  )

}