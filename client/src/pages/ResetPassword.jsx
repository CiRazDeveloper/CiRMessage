import "../styles/pages/resetPassword.css";

import InputField from "../components/input/InputField.jsx"

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "./../scripts/lib/axios.js";
import { saveUser } from "./../scripts/storage.js";

// import { useNotification } from "../scripts/notification_context.js";

function ResetPassword() {
    const navigate = useNavigate();
    // const { showNotification } = useNotification();
    
    const [identifier, setIdentifier] = useState("");
    const [secret, setSecret] = useState("");
    const [newPassword, setPassword] = useState("");

    async function handleResetPassword(event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/resetPassword", {
                identifier,
                secret,
                newPassword,
            });

            console.log(response.data);

            // showNotification("Password reset successfully", "success", { dismiss: "automatic",});

            navigate("/login");
        } catch (error) {
            console.error("Password reset failed:", error);
            // showNotification(error.response?.data?.message || "Could not reset password", "error");
        }
    }

    return (
        <div className="reset-password_main">
            <form className="reset-password_form">
                <div className="reset-password_container">
                    <h1>Reset Password!</h1>

                    <div className="reset-password_inputs">
                        <InputField
                            label="Email or Username"
                            name="reset-password_identifier-input"
                            isRequired
                            onChange={(e) => setIdentifier(e.target.value)}
                        />

                        <InputField
                            label="Secret"
                            placeholder="Required for password reset!"
                            name="reset-password_secret-input"
                            type="password"
                            isRequired
                            onChange={(e) => setSecret(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            name="reset-password_password-input"
                            type="password"
                            isRequired
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button id="reset-password_btn" onClick={handleResetPassword}>Reset Password</button>

                    <Link to="/login" id="reset-password_link-login">Back to Login</Link>
                </div>
            </form>
        </div>
    );
}

export default ResetPassword;
