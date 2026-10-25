import "../styles/general.css";
import "../styles/pages/register.css";

import InputField from "../components/input/InputField.jsx"

import { Link, useNavigate } from "react-router-dom";

function Register() {
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
                        />

                        <InputField
                            label="Username"
                            name="usernameInput"
                            isRequired
                        />

                        <InputField
                            label="Email"
                            name="emailInput"
                            isRequired
                        />

                        <InputField
                            label="Secret"
                            name="secretInput"
                            type="password"
                            isRequired
                        />

                        <InputField
                            label="Password"
                            name="passwordInput"
                            type="password"
                            isRequired
                        />
                    </div>

                    <button id="registerBtn">Register</button>

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
