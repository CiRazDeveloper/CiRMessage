import "../styles/login.css";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "../scripts/lib/axios.js";
import { saveUser } from "../storage.js";

import PasswordInput from "../components/PasswordInput.jsx";
import TextInput from "../components/TextInput.jsx";
import { useNotification } from "../components/NotificationContext.js";

function Login() {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");


    async function handleLogin(event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/login", {
                identifier,
                password
            });

            console.log(response.data);

            if (response.status === 200) {
                saveUser(response.data.user);
                showNotification("Login successful", "success", { dismiss: "automatic",});
                navigate("/home");
            }

        } catch (error) {
            console.error("Login failed:", error);
            showNotification(
                error.response?.data?.message ||
                    "Could not log in",
                "error"
            );
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <h1>Login</h1>

                <div className="login-inputs">
                    <TextInput
                        type="text"
                        placeholder="Email or Username"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                    />

                    <PasswordInput
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>

                <button className="login-button" onClick={handleLogin}>
                    Login
                </button>

                <div className="redirect-links">
                    <p>
                        Don't have an account?{" "}
                        <Link to="/signup">Sign up</Link>
                    </p>

                    <p>
                        Don't remember your password?{" "}
                        <Link to="/resetPassword">Reset password</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
