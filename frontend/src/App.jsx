import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";

import ProtectedRoute from "./pages/ProtectedRoute.jsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/resetPassword" element={<ResetPassword />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/chat/:id" element={<Chat />} />
                </Route>

                {/* Default */}
                <Route
                    path="*"
                    element={<Navigate to="/home" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;