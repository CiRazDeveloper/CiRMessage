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
                        role="alert"
                        className={
                            `notification notification-${notification.type}`
                        }
                    >
                        <div className="notification-content">
                            <strong className="notification-title">
                                {notification.type === "error"
                                    ? "Something went wrong"
                                    : notification.type === "success"
                                        ? "Success"
                                        : notification.type === "warning"
                                            ? "Please note"
                                            : "Information"}
                            </strong>

                            <span>{notification.message}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                removeNotification(
                                    notification.id
                                )
                            }
                            aria-label="Dismiss notification"
                        >
                            Dismiss
                        </button>
                    </div>
                )
            )}
        </div>
    );
}

export default NotificationContainer;