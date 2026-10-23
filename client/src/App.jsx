import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public route */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/resetPassword" element={<ResetPassword />} />

                {/* Protected route */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<Home />} />
                    {/* <Route path="/chat/:id" element={<Chat />} />
                    <Route path="/group/:id" element={<Chat />} /> */}
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