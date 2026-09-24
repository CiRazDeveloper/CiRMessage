import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { checkAuth } from "../scripts/security/checkAuth.js";

import Loading from "../components/Loading.jsx";
import SocketConnection from "../components/SocketConnection.jsx";

function ProtectedRoute() {
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

    return (
        <>
            <SocketConnection />
            <Outlet />
        </>
    );
}

export default ProtectedRoute;
