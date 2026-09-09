import { useEffect, useState } from "react";

const IDLE_TIMEOUT = 5 * 60 * 1000;

export function useStatus() {
    const [statusMode, setStatusMode] = useState(
        () => localStorage.getItem("statusMode") || "automatic"
    );

    const [automaticStatus, setAutomaticStatus] = useState("online");

    useEffect(() => {
        localStorage.setItem("statusMode", statusMode);
    }, [statusMode]);

    useEffect(() => {
        if (statusMode !== "automatic") return;

        let timer;

        const updateStatus = () => {
            if (document.visibilityState !== "visible") {
                setAutomaticStatus("offline");
                return;
            }

            setAutomaticStatus("online");
            clearTimeout(timer);

            timer = setTimeout(() => {
                setAutomaticStatus("away");
            }, IDLE_TIMEOUT);
        };

        const events = [
            "mousemove",
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
        ];

        events.forEach((event) =>
            window.addEventListener(event, updateStatus)
        );

        document.addEventListener("visibilitychange", updateStatus);
        updateStatus();

        return () => {
            clearTimeout(timer);

            events.forEach((event) =>
                window.removeEventListener(event, updateStatus)
            );

            document.removeEventListener("visibilitychange", updateStatus);
        };
    }, [statusMode]);

    return {
        statusMode,
        setStatusMode,
        currentStatus:
            statusMode === "automatic" ? automaticStatus : statusMode,
    };
}