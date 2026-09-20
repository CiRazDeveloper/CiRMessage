import {
    useCallback,
    useMemo,
    useState,
} from "react";
import { NotificationContext } from "./NotificationContext.js";

export function NotificationProvider({
    children,
}) {
    const [notifications, setNotifications] =
        useState([]);

    const showNotification = useCallback((
        message,
        type = "info",
        options = {}
    ) => {
        const {
            dismiss =
                type === "info"
                    ? "automatic"
                    : "manual",
            duration = 5000,
        } = options;
        const id = crypto.randomUUID();

        setNotifications((previous) => [
            ...previous,
            {
                id,
                message,
                type,
                dismiss,
                duration,
                createdAt: Date.now(),
            },
        ]);

        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((previous) =>
            previous.filter(
                (notification) =>
                    notification.id !== id
            )
        );
    }, []);

    const contextValue = useMemo(
        () => ({
            notifications,
            showNotification,
            removeNotification,
        }),
        [
            notifications,
            showNotification,
            removeNotification,
        ]
    );

    return (
        <NotificationContext.Provider
            value={contextValue}
        >
            {children}
        </NotificationContext.Provider>
    );
}
