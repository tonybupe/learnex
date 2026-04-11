import type { Class } from "../../types/class.types"

type Props = {
  classItem: Class
}

export default function ClassOverview({ classItem }: Props) {

  return (

    <div className="class-overview">

      <p>
        <strong>Code:</strong> {classItem.class_code}
      </p>

      <p>
        <strong>Teacher:</strong> {classItem.teacher?.full_name ?? "-"}
      </p>

      <p>
        <strong>Description:</strong> {classItem.description ?? "-"}
      </p>

    </div>

  )

}