import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Home from "./pages/Home.jsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public routes */}
                {/* <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/resetPassword" element={<ResetPassword />} /> */}

                {/* Protected routes */}
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