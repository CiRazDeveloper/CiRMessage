import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/global_call.css";

function SocketConnection() {
    const location = useLocation();

    useEffect(() => {

    }, [location.pathname]);
}

export default SocketConnection;
