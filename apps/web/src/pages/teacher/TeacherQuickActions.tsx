import { PlusCircle, FileText, Calendar, MessageSquare, BookOpen } from "lucide-react"
import { useNavigate } from "react-router-dom"

function ActionCard({
  title,
  icon,
  onClick
}: {
  title: string
  icon: React.ReactNode
  onClick?: () => void
}) {

  return (

    <button
      className="action-card"
      onClick={onClick}
      type="button"
    >

      <div className="action-icon">
        {icon}
      </div>

      <span className="action-title">
        {title}
      </span>

    </button>

  )

}

export default function TeacherQuickActions() {

  const navigate = useNavigate()

  return (

    <div className="actions-grid">

      <ActionCard
        title="Create Lesson"
        icon={<PlusCircle size={20} />}
        onClick={() => navigate("/lessons")}
      />

      <ActionCard
        title="Create Quiz"
        icon={<FileText size={20} />}
        onClick={() => navigate("/quizzes")}
      />

      <ActionCard
        title="Schedule Class"
        icon={<Calendar size={20} />}
        onClick={() => navigate("/classes")}
      />

      <ActionCard
        title="Create Post"
        icon={<MessageSquare size={20} />}
        onClick={() => navigate("/posts")}
      />

      {/* NEW SUBJECT ACTION */}

      <ActionCard
        title="Subjects"
        icon={<BookOpen size={20} />}
        onClick={() => navigate("/subjects")}
      />

    </div>

  )

}