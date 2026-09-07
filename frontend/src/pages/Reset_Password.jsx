import "../styles/reset_password.css";

import { axiosInstance } from "../lib/axios.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import toggleInputVisibility from "../components/Toggle_Input_Visibility.jsx";

function Reset_Password() {
    const navigate = useNavigate();
    const { showInput, toggleVisibility } = toggleInputVisibility();
    
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [newPassword, setPassword] = useState("");


    async function handleResetPassword(event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/reset_password", {
                username,
                email,
                newPassword
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
                <h1>CiRMessage - Reset Password</h1>

                <div className="reset_password-inputs">
                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                        />
                    </div>

                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="input-wrapper">
                        <input
                            type={showInput ? "text" : "password"}
                            placeholder="New Password"
                            value={newPassword}
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

                <button className="reset_password-button" onClick={handleResetPassword}>
                    Reset Password
                </button>
            </div>
        </div>
    );
}

export default Reset_Password;
