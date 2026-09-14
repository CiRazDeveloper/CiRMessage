import "../styles/notification.css";

import { useNotification } from "./NotificationContext.jsx";

function NotificationContainer() {
    const {
        notifications,
        removeNotification,
    } = useNotification();

    return (
        <div className="notification-container">
            {notifications.map(
                (notification) => (
                    <div
                        key={notification.id}
                        className={
                            `notification notification-${notification.type}`
                        }
                    >
                        <span>
                            {notification.message}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                removeNotification(
                                    notification.id
                                )
                            }
                            aria-label="Close notification"
                        >
                            ×
                        </button>
                    </div>
                )
            )}
        </div>
    );
}

export default NotificationContainer;