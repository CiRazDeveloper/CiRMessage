import {
    createContext,
    useContext,
    useState,
} from "react";

const NotificationContext =
    createContext(null);

export function NotificationProvider({
    children,
}) {
    const [notifications, setNotifications] =
        useState([]);

    function showNotification(
        message,
        type = "info",
        options = {}
    ) {
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
    }

    function removeNotification(id) {
        setNotifications((previous) =>
            previous.filter(
                (notification) =>
                    notification.id !== id
            )
        );
    }

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                showNotification,
                removeNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context =
        useContext(NotificationContext);

    if (!context) {
        throw new Error(
            "useNotification must be used inside NotificationProvider"
        );
    }

    return context;
}