import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Loading from "./../components/Loading.jsx";

import { checkAuth } from "../scripts/security/checkAuth.js";

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

    return <Outlet />;
}

export default ProtectedRoute;