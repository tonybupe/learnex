import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import SubjectTable from "@/features/subjects/components/SubjectTable"
import SubjectCreateModal from "@/features/subjects/components/SubjectCreateModal"
import { useSubjects } from "@/features/subjects/hooks/useSubjects"
import { useDeleteSubject } from "@/features/subjects/hooks/useDeleteSubject"
import { useAuthStore } from "@/features/auth/auth.store"
import { useAuth } from "@/features/auth/useAuth"
import type { Subject } from "@/features/subjects/types/subject.types"
import "@/features/subjects/subjects.css"

export default function SubjectsPage() {
  const { subjects, loading, reload } = useSubjects()
  const { deleteSubject } = useDeleteSubject()
  const user = useAuthStore(s => s.user)
  const { isTeacher, isAdmin } = useAuth()
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const canCreate = isTeacher || isAdmin

  // My subjects vs all subjects
  const mySubjects = subjects.filter((s: Subject) => s.created_by === user?.id)
  const otherSubjects = subjects.filter((s: Subject) => s.created_by !== user?.id)

  async function handleDelete(id: number) {
    await deleteSubject(id)
    reload()
  }

  function handleEdit(subject: Subject) {
    setEditingSubject(subject)
  }

  function handleCreated() {
    setEditingSubject(null)
    reload()
  }

  return (
    <AppShell>
      <div className="page-section">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Subjects</h1>
            <p className="page-sub">
              {isAdmin
                ? "Manage all subjects across the platform."
                : isTeacher
                ? "Your created subjects and all available subjects."
                : "Browse all available subjects."}
            </p>
          </div>
          {canCreate && (
            <SubjectCreateModal
              subject={editingSubject}
              onCreated={handleCreated}
              onCancel={() => setEditingSubject(null)}
            />
          )}
        </div>

        {/* RBAC notice for teachers */}
        {isTeacher && !isAdmin && (
          <div style={{
            padding: "10px 16px", borderRadius: 10, marginBottom: 16,
            background: "rgba(203,38,228,0.06)", border: "1px solid rgba(203,38,228,0.2)",
            fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8
          }}>
            🔒 <span>You can only <strong style={{ color: "var(--text)" }}>edit or delete subjects you created</strong>. All subjects are visible and usable for your lessons.</span>
          </div>
        )}

        {loading && <div className="card page-loading">Loading subjects...</div>}

        {!loading && subjects.length === 0 && (
          <div className="card page-empty">
            {canCreate ? "No subjects yet. Create the first one!" : "No subjects available yet."}
          </div>
        )}

        {/* Teacher view: My subjects first, then others */}
        {!loading && subjects.length > 0 && isTeacher && !isAdmin && (
          <>
            {mySubjects.length > 0 && (
              <>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--accent)", marginBottom: 8, marginTop: 4 }}>
                  ✏️ My Subjects ({mySubjects.length})
                </div>
                <SubjectTable subjects={mySubjects} onEdit={handleEdit} onDelete={handleDelete} />
              </>
            )}
            {otherSubjects.length > 0 && (
              <>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--muted)", marginBottom: 8, marginTop: mySubjects.length > 0 ? 20 : 4 }}>
                  📚 All Other Subjects ({otherSubjects.length})
                </div>
                <SubjectTable subjects={otherSubjects} onEdit={handleEdit} onDelete={handleDelete} />
              </>
            )}
          </>
        )}

        {/* Admin / learner: flat list */}
        {!loading && subjects.length > 0 && (isAdmin || (!isTeacher && !isAdmin)) && (
          <SubjectTable subjects={subjects} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>
    </AppShell>
  )
}