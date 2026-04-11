import type { Subject } from "../types/subject.types"

type Props = {
  subject: Subject
}

export default function SubjectCard({ subject }: Props) {

  return (

    <div className="subject-card">

      <div className="subject-name">
        {subject.name}
      </div>

      <div className="subject-code">
        {subject.code}
      </div>

      {subject.description && (

        <div className="subject-description">
          {subject.description}
        </div>

      )}

    </div>

  )

}