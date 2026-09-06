import "../styles/auth.css";

import { axiosInstance } from "../lib/axios.js";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveUser } from "../storage.js";

import toggleInputVisibility from "../components/Toggle_Input_Visibility.jsx";

function Signup() {
    const navigate = useNavigate();
    const { showInput, toggleVisibility } = toggleInputVisibility();
    
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");


    async function handleSignup(event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/signup", {
                displayName,
                username,
                email,
                password
            });

            console.log(response.data);

            saveUser(response.data.user);

            navigate("/home");
        } catch (error) {
            console.error("Signup failed:", error);
            console.log(error.response?.data);
        }
    }

    return (
        <div className="auth-container">
            <h1>CiRMessage - Sign up</h1>

            <form onSubmit={handleSignup}>
                <div className="auth-inputs">

                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Display name"
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                        />
                    </div>

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
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
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

                <button className="auth-button" type="submit">Sign up</button>

                <div className="redirect-links">
                    <p>
                        Do you already have an account?{" "}
                        <Link to="/login">Login</Link>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default Signup;
