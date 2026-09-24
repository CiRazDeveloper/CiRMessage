import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../scripts/lib/socket.js";
import { statuses } from "../scripts/setStatus.js";
import "../styles/globalCall.css";

function SocketConnection() {
    const navigate = useNavigate();
    const location = useLocation();
    const [incomingCall, setIncomingCall] = useState(null);

    useEffect(() => {
        const CHECK_INTERVAL_MS = 60 * 1000;
        const AWAY_AFTER_MS = 5 * 60 * 1000;

        let manualStatus =
            localStorage.getItem("activityStatus") || "Online";
        let effectiveStatus = manualStatus;
        let lastActivity = Date.now();

        const emitPresence = (status) => {
            if (!statuses.includes(status) || !socket.connected) {
                return;
            }

            effectiveStatus = status;
            socket.emit("set-status", status);
        };

        const syncManualStatus = () => {
            manualStatus =
                localStorage.getItem("activityStatus") || "Online";

            if (!statuses.includes(manualStatus)) {
                manualStatus = "Online";
            }

            lastActivity = Date.now();
            emitPresence(manualStatus);
        };

        const handleActivity = () => {
            lastActivity = Date.now();

            if (
                manualStatus === "Online" &&
                effectiveStatus === "Away"
            ) {
                emitPresence("Online");
            }
        };

        const checkActivity = () => {
            if (manualStatus !== "Online") {
                return;
            }

            if (
                Date.now() - lastActivity >= AWAY_AFTER_MS &&
                effectiveStatus !== "Away"
            ) {
                emitPresence("Away");
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                handleActivity();
            }
        };

        const handleManualStatusChanged = (event) => {
            const status = event.detail?.status;
            if (!statuses.includes(status)) {
                return;
            }

            manualStatus = status;
            lastActivity = Date.now();
            emitPresence(status);
        };

        function handleConnectError(error) {
            console.error(
                "Socket connection error:",
                error.message
            );
        }

        function handleNewMessage(message) {
            if (!message?._id) {
                return;
            }

            socket.emit(
                "message-delivered",
                message._id
            );
        }

        function handleIncomingCall(payload) {
            if (!payload?.callId || !payload?.callerId) {
                return;
            }

            const directChatPath = `/chat/${payload.callerId}`;
            const groupChatPath = payload.groupId
                ? `/group/${payload.groupId}`
                : null;

            if (
                location.pathname === directChatPath ||
                (groupChatPath && location.pathname === groupChatPath)
            ) {
                return;
            }

            setIncomingCall({
                ...payload,
                callerName:
                    payload.callerName ||
                    "Unknown caller",
            });
        }

        function handleCallFinished(payload) {
            setIncomingCall((current) =>
                current?.callId === payload?.callId
                    ? null
                    : current
            );
        }

        socket.on("connect_error", handleConnectError);
        socket.on("connect", syncManualStatus);
        socket.on("new-message", handleNewMessage);
        socket.on("call-invite", handleIncomingCall);
        socket.on("call-end", handleCallFinished);
        socket.on("call-reject", handleCallFinished);

        const activityEvents = [
            "mousedown",
            "keydown",
            "touchstart",
            "scroll",
        ];

        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, handleActivity, {
                passive: true,
            });
        });
        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );
        window.addEventListener(
            "activity-status-changed",
            handleManualStatusChanged
        );

        const activityCheckInterval = setInterval(
            checkActivity,
            CHECK_INTERVAL_MS
        );

        if (!socket.connected) {
            socket.connect();
        } else {
            syncManualStatus();
        }

        return () => {
            clearInterval(activityCheckInterval);

            activityEvents.forEach((eventName) => {
                window.removeEventListener(
                    eventName,
                    handleActivity
                );
            });
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener(
                "activity-status-changed",
                handleManualStatusChanged
            );
            socket.off("connect_error", handleConnectError);
            socket.off("connect", syncManualStatus);
            socket.off("new-message", handleNewMessage);
            socket.off("call-invite", handleIncomingCall);
            socket.off("call-end", handleCallFinished);
            socket.off("call-reject", handleCallFinished);
        };
    }, [location.pathname]);

    function openIncomingCall() {
        if (!incomingCall) {
            return;
        }

        const call = incomingCall;
        setIncomingCall(null);

        navigate(
            call.groupId
                ? `/group/${call.groupId}`
                : `/chat/${call.callerId}`,
            {
                state: {
                    incomingCall: call,
                    user: call.groupId
                        ? null
                        : {
                            _id: call.callerId,
                            displayName: call.callerName,
                        },
                },
            }
        );
    }

    return incomingCall ? (
        <button
            type="button"
            className="global-call-banner"
            onClick={openIncomingCall}
            aria-label={`Open incoming call from ${incomingCall.callerName}`}
        >
            <span className="global-call-banner-icon" aria-hidden="true">
                📞
            </span>

            <span className="global-call-banner-text">
                <strong>
                    Receiving call from {incomingCall.callerName}
                </strong>
                <small>
                    {incomingCall.groupId
                        ? "Group call"
                        : "Direct call"}
                    {" · "}
                    Click to open
                </small>
            </span>

            <span className="global-call-banner-arrow" aria-hidden="true">
                ›
            </span>
        </button>
    ) : null;
}

export default SocketConnection;
