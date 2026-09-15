import "../styles/notification.css";

import { useEffect } from "react";
import { useNotification } from "./NotificationContext.jsx";

function NotificationContainer() {
    const {
        notifications,
        removeNotification,
    } = useNotification();

    useEffect(() => {
        const timers = notifications
            .filter(
                (notification) =>
                    notification.dismiss === "automatic"
            )
            .map((notification) => {
                const duration =
                    Number.isFinite(notification.duration) &&
                    notification.duration > 0
                        ? notification.duration
                        : 5000;

                const remainingTime = Math.max(
                    0,
                    notification.createdAt +
                        duration -
                        Date.now()
                );

                return window.setTimeout(() => {
                    removeNotification(notification.id);
                }, remainingTime);
            });

        return () => {
            timers.forEach((timer) => {
                window.clearTimeout(timer);
            });
        };
    }, [notifications, removeNotification]);

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

                        {notification.dismiss === "manual" && (
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
                        )}
                    </div>
                )
            )}
        </div>
    );
}

export default NotificationContainer;