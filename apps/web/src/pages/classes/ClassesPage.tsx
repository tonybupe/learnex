import { useState } from "react"

import AppShell from "@/components/layout/AppShell"

import ClassTable from "@/features/classes/components/ClassTable"
import ClassCreateModal from "@/features/classes/components/ClassCreateModal"

import { useClasses } from "@/features/classes/hooks/useClasses"
import { useDeleteClass } from "@/features/classes/hooks/useDeleteClass"

import type { Class } from "@/features/classes/types/class.types"

import "@/features/classes/classes.css"

/*
-----------------------------------------
CLASSES PAGE
Manage learning classes
-----------------------------------------
*/

export default function ClassesPage() {

  const { classes, loading, reload } = useClasses()

  const { deleteClass } = useDeleteClass()

  /*
  -----------------------------------------
  EDIT STATE
  -----------------------------------------
  */

  const [editingClass, setEditingClass] = useState<Class | null>(null)

  /*
  -----------------------------------------
  DELETE
  -----------------------------------------
  */

  async function handleDelete(id: number) {

    await deleteClass(id)

    reload()

  }

  /*
  -----------------------------------------
  EDIT
  -----------------------------------------
  */

  function handleEdit(classItem: Class) {

    setEditingClass(classItem)

  }

  /*
  -----------------------------------------
  AFTER CREATE / UPDATE
  -----------------------------------------
  */

  function handleCreated() {

    setEditingClass(null)

    reload()

  }

  /*
  -----------------------------------------
  RENDER
  -----------------------------------------
  */

  return (

    <AppShell>

      <div className="page-section">

        {/* ---------- HEADER ---------- */}

        <div className="page-header">

          <div>

            <h1 className="page-title">
              Classes
            </h1>

            <p className="page-sub">
              Manage learning classes and enroll students.
            </p>

          </div>

          <ClassCreateModal
            classItem={editingClass}
            onCreated={handleCreated}
            onCancel={() => setEditingClass(null)}
          />

        </div>


        {/* ---------- LOADING ---------- */}

        {loading && (

          <div className="card page-loading">
            Loading classes...
          </div>

        )}


        {/* ---------- EMPTY STATE ---------- */}

        {!loading && classes.length === 0 && (

          <div className="card page-empty">
            No classes created yet.
          </div>

        )}


        {/* ---------- TABLE ---------- */}

        {!loading && classes.length > 0 && (

          <ClassTable
            classes={classes}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

        )}

      </div>

    </AppShell>

  )

}