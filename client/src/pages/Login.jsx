import "../styles/pages/login.css";

import InputField from "../components/input/InputField.jsx"

import { Link, useNavigate } from "react-router-dom";

function Login() {
    return (
        <div className="main">
            <div className="container">
                <h1>Welcome back!</h1>
                <h6>Login with your credentials below!</h6>

                <div className="inputs">
                    <InputField
                        label="Email or Username"
                        name="usernameOrEmailInput"
                        isRequired
                    />

                    <div className="password">
                        <InputField
                            label="Password"
                            name="passwordInput"
                            type="password"
                            isRequired
                        />

                        <Link to="/signup" id="link-forgot-password">Forgot your password?</Link>
                    </div>
                </div>

                <button id="loginBtn">Login</button>
                <p id="register">
                    Need an account?{" "}
                    <Link to="/register" id="link-register">Register</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
