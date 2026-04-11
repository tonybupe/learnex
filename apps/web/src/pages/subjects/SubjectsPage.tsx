import { useState } from "react"

import AppShell from "@/components/layout/AppShell"

import SubjectTable from "@/features/subjects/components/SubjectTable"
import SubjectCreateModal from "@/features/subjects/components/SubjectCreateModal"

import { useSubjects } from "@/features/subjects/hooks/useSubjects"
import { useDeleteSubject } from "@/features/subjects/hooks/useDeleteSubject"

import type { Subject } from "@/features/subjects/types/subject.types"

import "@/features/subjects/subjects.css"

export default function SubjectsPage() {

  const { subjects, loading, reload } = useSubjects()
  const { deleteSubject } = useDeleteSubject()

  // ---------- EDIT STATE ----------
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)

  // ---------- DELETE ----------
  async function handleDelete(id: number) {

    await deleteSubject(id)

    reload()

  }

  // ---------- EDIT ----------
  function handleEdit(subject: Subject) {

    setEditingSubject(subject)

  }

  // ---------- AFTER CREATE / UPDATE ----------
  function handleCreated() {

    setEditingSubject(null)

    reload()

  }

  return (

    <AppShell>

      <div className="page-section">

        {/* ---------- HEADER ---------- */}

        <div className="page-header">

          <div>

            <h1 className="page-title">
              Subjects
            </h1>

            <p className="page-sub">
              Manage and organize learning subjects.
            </p>

          </div>

          <SubjectCreateModal
            subject={editingSubject}
            onCreated={handleCreated}
            onCancel={() => setEditingSubject(null)}
          />

        </div>


        {/* ---------- LOADING ---------- */}

        {loading && (

          <div className="card page-loading">
            Loading subjects...
          </div>

        )}


        {/* ---------- EMPTY STATE ---------- */}

        {!loading && subjects.length === 0 && (

          <div className="card page-empty">
            No subjects created yet.
          </div>

        )}


        {/* ---------- SUBJECT TABLE ---------- */}

        {!loading && subjects.length > 0 && (

          <SubjectTable
            subjects={subjects}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

        )}

      </div>

    </AppShell>

  )

}