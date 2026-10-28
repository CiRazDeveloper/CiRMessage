import "../styles/general.css";
import "../styles/pages/register.css";

import InputField from "../components/input/InputField.jsx"

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "./../scripts/lib/axios.js";
import { saveUser } from "./../scripts/storage.js";

// import { useNotification } from "../scripts/notification_context.js";

function Register() {
    const navigate = useNavigate();
    // const { showNotification } = useNotification();
    
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [secret, setSecret] = useState("");

    async function handleRegister(event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/register", {
                displayName,
                username,
                email,
                secret,
                password
            });

            console.log(response.data);

            saveUser(response.data.user);

            // showNotification("Account created successfully", "success", { dismiss: "automatic",});

            navigate("/home");
        } catch (error) {
            console.error("Signup failed:", error);
            // showNotification(error.response?.data?.message || "Could not create account", "error");
        }
    }

    return (
        <div className="register_main">
            <form className="register_form">
                <div className="register_container">
                    <h1>Create an account!</h1>

                    <div className="register_inputs">
                        <InputField
                            label="Display Name"
                            name="register_display-name-input"
                            isRequired
                            onChange={(e) => setDisplayName(e.target.value)}
                        />

                        <InputField
                            label="Username"
                            name="register_username-input"
                            isRequired
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <InputField
                            label="Email"
                            name="register_email-input"
                            isRequired
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Secret"
                            placeholder="Required for password reset, cannot be changed!"
                            name="register_secret-input"
                            type="password"
                            isRequired
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            name="register_password-input"
                            type="password"
                            isRequired
                            onChange={(e) => setSecret(e.target.value)}
                        />
                    </div>

                    <button id="register_btn" onClick={handleRegister}>Register</button>

                    <p id="register_text-link">
                        Already have an account?{" "}
                        <Link to="/login" id="register_link-login">Login</Link>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default Register;
