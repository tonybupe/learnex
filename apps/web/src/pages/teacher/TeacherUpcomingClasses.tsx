export default function TeacherUpcomingClasses() {

  const classes = [
    { subject: "Mathematics", time: "10:00 AM", class: "Grade 11A" },
    { subject: "Computer Studies", time: "12:00 PM", class: "Grade 10B" },
  ]

  return (

    <div className="card">

      <div className="card-title">
        Upcoming Classes
      </div>

      <div className="upcoming-list">

        {classes.map((c, i) => (

          <div
            key={i}
            className="upcoming-item"
          >

            <div>

              <div className="upcoming-subject">
                {c.subject}
              </div>

              <div className="card-sub">
                {c.class}
              </div>

            </div>

            <div className="upcoming-time">
              {c.time}
            </div>

          </div>

        ))}

      </div>

    </div>

  )

}