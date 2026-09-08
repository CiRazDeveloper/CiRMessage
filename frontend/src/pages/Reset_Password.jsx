import "../styles/reset_password.css";

import { axiosInstance } from "../lib/axios.js";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import toggleInputVisibility from "../components/Toggle_Input_Visibility.jsx";

function Reset_Password() {
    const navigate = useNavigate();
    const {
        showInput: showInputSecret,
        toggleVisibility: toggleVisibilitySecret,
    } = toggleInputVisibility();

    const {
        showInput: showInputPassword,
        toggleVisibility: toggleVisibilityPassword,
    } = toggleInputVisibility();

    
    const [identifier, setIdentifier] = useState("");
    const [secret, setSecret] = useState("");
    const [newPassword, setPassword] = useState("");


    async function handleResetPassword(event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/reset_password", {
                identifier,
                secret,
                newPassword,
            });

            console.log(response.data);

            navigate("/login");
        } catch (error) {
            console.error("Password reset failed:", error);
            console.log(error.response?.data);
        }
    }

    return (
        <div className="reset_password-page">
            <div className="reset_password-container">
                <h1>Reset Password</h1>

                <div className="reset_password-inputs">
                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Username or Email"
                            value={identifier}
                            onChange={(event) => setIdentifier(event.target.value)}
                        />
                    </div>

                    <div className="input-wrapper">
                        <input
                            type={showInputSecret ? "text" : "password"}
                            placeholder="Secret"
                            value={secret}
                            onChange={(event) => setSecret(event.target.value)}
                        />

                        <button type="button" className="input-toggle" onClick={toggleVisibilitySecret}>
                            <img
                                src={showInputSecret ? "/eye_on.svg" : "/eye_off.svg"}
                                alt={showInputSecret ? "Hide secret" : "Show secret"}
                            />
                        </button>
                    </div>

                    <div className="input-wrapper">
                        <input
                            type={showInputPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(event) => setPassword(event.target.value)}
                        />

                        <button type="button" className="input-toggle" onClick={toggleVisibilityPassword}>
                            <img
                                src={showInputPassword ? "/eye_on.svg" : "/eye_off.svg"}
                                alt={showInputPassword ? "Hide password" : "Show password"}
                            />
                        </button>
                    </div>
                </div>

                <button className="reset_password-button" onClick={handleResetPassword}>
                    Reset Password
                </button>

                <div className="redirect-links">
                    <p>
                        Do you want to go back?{" "}
                        <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Reset_Password;
