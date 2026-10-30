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
            navigate("/home");

            // const response = await axiosInstance.post("/auth/login", {
            //     identifier,
            //     password
            // });

            // console.log(response.data);

            // if (response.status === 200) {
            //     saveUser(response.data.user);
            //     // showNotification("Login successful", "success", { dismiss: "automatic",});
            //     navigate("/home");
            // }

        } catch (error) {
            console.error("Login failed:", error);
            // showNotification(error.response?.data?.message || "Could not log in", "error");
        }
    }

    return (
        <div className="login_main">
            <form className="login_form">
                <div className="login_container">
                    <h1>Welcome stranger!</h1>

                    <div className="login_inputs">
                        <InputField
                            label="Email or Username"
                            name="login_identifier-input"
                            isRequired
                            onChange={(e) => setIdentifier(e.target.value)}
                        />

                        <div className="login_password">
                            <InputField
                                label="Password"
                                name="login_password-input"
                                type="password"
                                isRequired
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <Link to="/resetPassword" id="login_link-forgot-password">Forgot your password?</Link>
                        </div>
                    </div>

                    <button id="login_btn" onClick={handleLogin}>Login</button>

                    <p id="login_text-link">
                        Need an account?{" "}
                        <Link to="/register" id="login_link-register">Register</Link>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default Login;
