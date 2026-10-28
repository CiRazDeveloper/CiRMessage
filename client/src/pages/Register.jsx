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
        <div className="main">
            <form className="form">
                <div className="container">
                    <h1>Create an account!</h1>

                    <div className="inputs">
                        <InputField
                            label="Display Name"
                            name="displayNameInput"
                            isRequired
                            onChange={(e) => setDisplayName(e.target.value)}
                        />

                        <InputField
                            label="Username"
                            name="usernameInput"
                            isRequired
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <InputField
                            label="Email"
                            name="emailInput"
                            isRequired
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Secret"
                            placeholder="Required for password reset, cannot be changed!"
                            name="secretInput"
                            type="password"
                            isRequired
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            name="passwordInput"
                            type="password"
                            isRequired
                            onChange={(e) => setSecret(e.target.value)}
                        />
                    </div>

                    <button id="registerBtn" onClick={handleRegister}>Register</button>

                    <p id="login">
                        Already have an account?{" "}
                        <Link to="/login" id="link-login">Login</Link>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default Register;
