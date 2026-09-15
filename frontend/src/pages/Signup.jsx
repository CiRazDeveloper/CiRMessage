import "../styles/signup.css";

import { axiosInstance } from "../scripts/lib/axios.js";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveUser } from "../storage.js";

import PasswordInput from "../components/PasswordInput.jsx";
import TextInput from "../components/TextInput.jsx";
import { useNotification } from "../components/NotificationContext.jsx";

function Signup() {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [secret, setSecret] = useState("");


    async function handleSignup(event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/signup", {
                displayName,
                username,
                email,
                secret,
                password
            });

            console.log(response.data);

            saveUser(response.data.user);

            showNotification("Account created successfully", "success", { dismiss: "automatic",});

            navigate("/home");
        } catch (error) {
            console.error("Signup failed:", error);
            showNotification(
                error.response?.data?.message ||
                    "Could not create account",
                "error"
            );
        }
    }

    return (
        <div className="signup-page">
            <div className="signup-container">
                <h1>Signup</h1>

                <div className="signup-inputs">
                    <TextInput
                        type="text"
                        placeholder="Display Name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                    />

                    <TextInput
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />

                    <TextInput
                        type="text"
                        placeholder="Email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />

                    <PasswordInput
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <PasswordInput
                        placeholder="Secret (REMEMBER THIS!)"
                        value={secret}
                        onChange={(event) => setSecret(event.target.value)}
                    />

                </div>

                <button className="signup-button" onClick={handleSignup}>
                    Sign up
                </button>

                <div className="redirect-links">
                    <p>
                        Do you already have an account?{" "}
                        <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Signup;
