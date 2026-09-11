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
        };
    }, []);

    return null;
}

export default SocketConnection;