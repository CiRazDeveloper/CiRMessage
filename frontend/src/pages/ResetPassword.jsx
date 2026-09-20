import "../styles/resetPassword.css";

import { axiosInstance } from "../scripts/lib/axios.js";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import PasswordInput from "../components/PasswordInput.jsx";
import TextInput from "../components/TextInput.jsx";
import { useNotification } from "../components/NotificationContext.jsx";

function ResetPassword() {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
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

            showNotification("Password reset successfully", "success", { dismiss: "automatic",});

            navigate("/login");
        } catch (error) {
            console.error("Password reset failed:", error);
            showNotification(
                error.response?.data?.message ||
                    "Could not reset password",
                "error"
            );
        }
    }

    return (
        <div className="reset_password-page">
            <div className="reset_password-container">
                <h1>Reset Password</h1>

                <div className="reset_password-inputs">
                    <TextInput
                        type="text"
                        placeholder="Email or Username"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                    />

                    <PasswordInput
                        placeholder="Secret"
                        value={secret}
                        onChange={(event) => setSecret(event.target.value)}
                    />

                    <PasswordInput
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(event) => setPassword(event.target.value)}
                    />
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

export default ResetPassword;
