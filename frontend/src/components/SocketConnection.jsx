import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../scripts/lib/socket.js";
import "../styles/globalCall.css";

function SocketConnection() {
    const navigate = useNavigate();
    const location = useLocation();
    const [incomingCall, setIncomingCall] = useState(null);

    useEffect(() => {
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
        socket.on("new-message", handleNewMessage);
        socket.on("call-invite", handleIncomingCall);
        socket.on("call-end", handleCallFinished);
        socket.on("call-reject", handleCallFinished);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off("connect_error", handleConnectError);
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
