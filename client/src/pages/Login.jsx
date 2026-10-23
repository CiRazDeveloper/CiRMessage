import "../styles/login.css";

import InputField from "../components/input/InputField.jsx"

import { Link, useNavigate } from "react-router-dom";

function Login() {
    return (
        <div className="main">

            <div className="headers">
                <h1>Welcome!</h1>
                <h3>Login with your credentials below!</h3>
            </div>

            <InputField
                label="Email or Username"
                name="usernameOrEmailInput"
                isRequired
            />

            <InputField
                label="Password"
                name="passwordInput"
                type="password"
                isRequired
            />

            

        </div>
    );
}

export default Login;
