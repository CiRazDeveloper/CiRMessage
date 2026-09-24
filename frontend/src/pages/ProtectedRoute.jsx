import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { checkAuth } from "../scripts/security/checkAuth.js";

import Loading from "../components/Loading.jsx";
import SocketConnection from "../components/SocketConnection.jsx";

function ProtectedRoute() {
    const location = useLocation();
    const initialPathRef = useRef(window.location.pathname);
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        async function authenticate() {
            const authenticated = await checkAuth();
            setIsAuthenticated(authenticated);
        }

        authenticate();
    }, []);

    if (isAuthenticated === null) {
        return <Loading />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const initialPath = initialPathRef.current;
    const startedInsideChat =
        initialPath.startsWith("/chat/") ||
        initialPath.startsWith("/group/");
    const isMobileViewport =
        window.matchMedia?.("(max-width: 768px)").matches ?? false;

    if (
        isMobileViewport &&
        startedInsideChat &&
        location.pathname === initialPath
    ) {
        return <Navigate to="/home" replace />;
    }

    return (
        <>
            <SocketConnection />
            <Outlet />
        </>
    );
}

export default ProtectedRoute;