import "./../../styles/components/input/inputField.css";

import { useState } from "react";

import ShowInput from "./ShowInput.jsx"

function InputField({label = "", placeholder = "", isRequired = false, type = "text", name }) {
    const [isVisible, setIsVisible] = useState(false);
    const inputType = type === "password" && isVisible ? "text" : type;

    return (
        <div className="inputField">
            <label htmlFor={name}>
                {label}{" "}
                {isRequired && <span className="required">*</span>}
            </label>

            <div className="inputWrapper">
                <input
                    id={name}
                    name={name}
                    placeholder={placeholder}
                    type={inputType}
                    required={isRequired}
                />

                {type === "password" && (
                    <ShowInput
                        isVisible={isVisible}
                        onToggle={() => setIsVisible((visible) => !visible)}
                    />
                )}
            </div>

        </div>
    );
}

export default InputField;