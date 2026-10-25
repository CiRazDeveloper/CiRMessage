import "../styles/general.css";
import "../styles/pages/login.css";

import InputField from "../components/input/InputField.jsx"

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "./../scripts/lib/axios.js";
import { saveUser } from "./../scripts/storage.js";

// import { useNotification } from "../scripts/notification_context.js";

function Login() {
    const navigate = useNavigate();
    // const { showNotification } = useNotification();
    
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
                // showNotification("Login successful", "success", { dismiss: "automatic",});
                navigate("/home");
            }

        } catch (error) {
            console.error("Login failed:", error);
            // showNotification(
            //     error.response?.data?.message ||
            //         "Could not log in",
            //     "error"
            // );
        }
    }

    return (
        <div className="main">
            <form className="form">
                <div className="container">
                    <h1>Welcome stranger!</h1>

                    <div className="inputs">
                        <InputField
                            label="Email or Username"
                            name="usernameOrEmailInput"
                            isRequired
                            onChange={(e) => setIdentifier(e.target.value)}
                        />

                        <div className="password">
                            <InputField
                                label="Password"
                                name="passwordInput"
                                type="password"
                                isRequired
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <Link to="/signup" id="link-forgot-password">Forgot your password?</Link>
                        </div>
                    </div>

                    <button id="loginBtn" onClick={handleLogin}>Login</button>

                    <p id="register">
                        Need an account?{" "}
                        <Link to="/register" id="link-register">Register</Link>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default Login;
