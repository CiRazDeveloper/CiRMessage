import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../scripts/lib/socket.js";

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
                    "Incoming call",
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

    function rejectCall() {
        if (!incomingCall) {
            return;
        }

        socket.emit("call-reject", {
            callId: incomingCall.callId,
            ...(incomingCall.groupId
                ? { groupId: incomingCall.groupId }
                : { targetUserId: incomingCall.callerId }),
        });

        setIncomingCall(null);
    }

    function acceptCall() {
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
        <div className="global-incoming-call" role="dialog" aria-live="assertive">
            <div className="global-incoming-call-card">
                <strong>{incomingCall.callerName}</strong>
                <span>
                    Incoming {incomingCall.callType || "video"} call
                </span>
                <div className="global-incoming-call-actions">
                    <button type="button" onClick={acceptCall}>
                        Accept
                    </button>
                    <button
                        type="button"
                        className="call-danger"
                        onClick={rejectCall}
                    >
                        Reject
                    </button>
                </div>
            </div>
        </div>
    ) : null;
}

export default SocketConnection;
