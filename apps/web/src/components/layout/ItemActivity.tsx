type ActivityItemProps = {
  title: string
  description: string
  time: string
}

export default function ActivityItem({
  title,
  description,
  time,
}: ActivityItemProps) {

  return (

    <div className="activity-row">

      <div className="activity-title">
        {title}
      </div>

      <div className="activity-desc">
        {description}
      </div>

      <div className="activity-time">
        {time}
      </div>

    </div>

  )

}