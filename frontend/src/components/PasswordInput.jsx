import "./../styles/passwordInput.css";

import toggleInputVisibility from "./ToggleInputVisibility.jsx";

function PasswordInput({
    placeholder,
    value,
    onChange,
    name,
    autoComplete,
}) {
    const {
        showInput,
        toggleVisibility,
    } = toggleInputVisibility();

    return (
        <div className="password-input">
            <input
                type={showInput ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                name={name}
                autoComplete={autoComplete}
            />

            <button
                type="button"
                className="password-input-toggle"
                onClick={toggleVisibility}
            >
                <img
                    src={
                        showInput
                            ? "/eye_on.svg"
                            : "/eye_off.svg"
                    }
                    alt={
                        showInput
                            ? `Hide ${placeholder.toLowerCase()}`
                            : `Show ${placeholder.toLowerCase()}`
                    }
                />
            </button>
        </div>
    );
}

export default PasswordInput;
