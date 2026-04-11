export default function TeacherActivity() {

  const activities = [
    "You posted a new lesson for Grade 11",
    "Quiz submitted by 12 students",
    "New comment on your lesson",
  ]

  return (

    <div className="card">

      <div className="card-title">
        Recent Activity
      </div>

      <ul className="activity-list">

        {activities.map((a, i) => (
          <li key={i} className="activity-item">
            {a}
          </li>
        ))}

      </ul>

    </div>

  )

}