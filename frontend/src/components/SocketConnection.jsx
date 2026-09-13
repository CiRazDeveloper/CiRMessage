import { useEffect } from "react";
import { socket } from "../scripts/lib/socket.js";

function SocketConnection() {
    useEffect(() => {
        function handleConnect() {
            console.log(
                "Socket connected:",
                socket.id
            );
        }

        function handleDisconnect(reason) {
            console.log(
                "Socket disconnected:",
                reason
            );
        }

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

        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "connect_error",
            handleConnectError
        );

        socket.on(
            "new-message",
            handleNewMessage
        );

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "connect_error",
                handleConnectError
            );

            socket.off(
                "new-message",
                handleNewMessage
            );
        };
    }, []);

    return null;
}

export default SocketConnection;