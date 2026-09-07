import "../styles/login.css";

import { axiosInstance } from "../lib/axios.js";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveUser } from "../storage.js";

import toggleInputVisibility from "../components/Toggle_Input_Visibility.jsx";

function Login() {
    const navigate = useNavigate();
    const { showInput, toggleVisibility } = toggleInputVisibility();
    
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

            saveUser(response.data.user);

            navigate("/home");
        } catch (error) {
            console.error("Login failed:", error);
            console.log(error.response?.data);
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <h1>CiRMessage - Login</h1>

                <div className="login-inputs">
                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Email or Username"
                            value={identifier}
                            onChange={(event) => setIdentifier(event.target.value)}
                        />
                    </div>

                    <div className="input-wrapper">
                        <input
                            type={showInput ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />

                        <button type="button" className="input-toggle" onClick={toggleVisibility}>
                            <img
                                src={showInput ? "/eye_on.svg" : "/eye_off.svg"}
                                alt={showInput ? "Hide password" : "Show password"}
                            />
                        </button>
                    </div>
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
                        <Link to="/reset_password">Reset password</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
