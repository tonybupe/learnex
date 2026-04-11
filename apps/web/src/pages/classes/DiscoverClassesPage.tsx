import { useState } from "react"

import AppShell from "@/components/layout/AppShell"

import ClassCard from "@/features/classes/components/ClassCard"

import { useDiscoverClasses } from "@/features/classes/hooks/useDiscoverClasses"
import { useJoinClass } from "@/features/classes/hooks/useJoinClass"
import { useLeaveClass } from "@/features/classes/hooks/useLeaveClass"

import "@/features/classes/classes.css"

/*
-----------------------------------------
DISCOVER CLASSES PAGE
Learners browse and join public classes
-----------------------------------------
*/

export default function DiscoverClassesPage() {

  const { classes, loading } = useDiscoverClasses()

  const { joinClass } = useJoinClass()
  const { leaveClass } = useLeaveClass()

  /*
  -----------------------------------------
  LOCAL MEMBERSHIP STATE
  Tracks joined classes
  -----------------------------------------
  */

  const [joinedMap, setJoinedMap] = useState<Record<number, boolean>>({})
  const [processing, setProcessing] = useState<number | null>(null)

  /*
  -----------------------------------------
  JOIN CLASS
  -----------------------------------------
  */

  async function handleJoin(id: number) {

    if (processing === id) return

    try {

      setProcessing(id)

      await joinClass(id)

      setJoinedMap(prev => ({
        ...prev,
        [id]: true
      }))

    } catch (err: any) {

      if (err.message?.includes("already a member")) {

        setJoinedMap(prev => ({
          ...prev,
          [id]: true
        }))

      } else {

        alert(err.message || "Unable to join class")

      }

    } finally {

      setProcessing(null)

    }

  }

  /*
  -----------------------------------------
  LEAVE CLASS
  -----------------------------------------
  */

  async function handleLeave(id: number) {

    if (processing === id) return

    const confirmLeave = confirm(
      "Are you sure you want to leave this class?"
    )

    if (!confirmLeave) return

    try {

      setProcessing(id)

      await leaveClass(id)

      setJoinedMap(prev => ({
        ...prev,
        [id]: false
      }))

    } catch (err: any) {

      alert(err.message || "Unable to leave class")

    } finally {

      setProcessing(null)

    }

  }

  /*
  -----------------------------------------
  RENDER
  -----------------------------------------
  */

  return (

    <AppShell>

      <div className="page-section">

        {/* HEADER */}

        <div className="page-header">

          <div>

            <h1 className="page-title">
              Discover Classes
            </h1>

            <p className="page-sub">
              Browse available classes and join learning communities.
            </p>

          </div>

        </div>


        {/* LOADING */}

        {loading && (

          <div className="card page-loading">
            Loading classes...
          </div>

        )}


        {/* EMPTY STATE */}

        {!loading && classes.length === 0 && (

          <div className="card page-empty">
            No classes available to join.
          </div>

        )}


        {/* CLASS GRID */}

        {!loading && classes.length > 0 && (

          <div className="class-grid">

            {classes.map((classItem) => (

              <ClassCard
                key={classItem.id}
                classItem={classItem}
                joined={joinedMap[classItem.id] ?? false}
                processing={processing === classItem.id}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />

            ))}

          </div>

        )}

      </div>

    </AppShell>

  )

}