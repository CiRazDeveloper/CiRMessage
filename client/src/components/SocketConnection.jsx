import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function SocketConnection() {
    const location = useLocation();

    useEffect(() => {

    }, [location.pathname]);
}

export default SocketConnection;
