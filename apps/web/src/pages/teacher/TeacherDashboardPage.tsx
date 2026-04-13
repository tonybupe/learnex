import { useState, useEffect, useRef } from "react"
import AppShell from "@/components/layout/AppShell"

import TeacherDashboardHeader from "./TeacherDashboardHeader"
import TeacherStats from "./TeacherStats"
import TeacherQuickActions from "./TeacherQuickActions"
import TeacherUpcomingClasses from "./TeacherUpcomingClasses"
import TeacherActivity from "./TeacherActivity"

import FeedSection from "@/pages/shared/FeedSection"

export default function TeacherDashboardPage() {

  return (

    <AppShell>

      <div className="dashboard-stack">

        <TeacherDashboardHeader />

        <TeacherStats />

        <TeacherQuickActions />

        <TeacherUpcomingClasses />

        <TeacherActivity />

        {/* 🔥 MAIN ENGAGEMENT AREA */}
        <FeedSection />

        {/* 🔥 SUPPORTING GRID */}
        <div className="dashboard-grid">

          

        </div>

      </div>

    </AppShell>

  )

}