import { useNotifications } from "@/features/notifications/hooks/useNotifications"
import type { Notification } from "@/features/notifications/types/notification.types"

export default function RightPanel() {

  const { notifications } = useNotifications()

  return (

    <div className="right-panel">

      {/* Notifications */}

      <div className="card">

        <div className="card-title">
          Notifications
        </div>

        <div className="right-panel-list">

          {notifications?.slice(0, 5).map((n: Notification) => (

            <div
              key={n.id}
              className="right-panel-item"
            >
              {n.title ?? n.message}
            </div>

          ))}

          {!notifications?.length && (

            <div className="card-sub">
              No notifications
            </div>

          )}

        </div>

      </div>


      {/* Upcoming Classes */}

      <div className="card">

        <div className="card-title">
          Upcoming Classes
        </div>

        <div className="card-sub">
          No scheduled classes
        </div>

      </div>


      {/* Trending Teachers */}

      <div className="card">

        <div className="card-title">
          Trending Teachers
        </div>

        <div className="card-sub">
          Trending educators will appear here
        </div>

      </div>

    </div>

  )

}