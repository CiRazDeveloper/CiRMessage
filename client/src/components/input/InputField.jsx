import "./../../styles/general.css";
import "./../../styles/components/input/inputField.css";

import { useState } from "react";

import ShowInput from "./ShowInput.jsx"

function InputField({label = "", placeholder = "", isRequired = false, type = "text", name, onChange }) {
    const [isVisible, setIsVisible] = useState(false);
    const inputType = type === "password" && isVisible ? "text" : type;

    return (
        <div className="input-field_main">
            <label>
                {label}{" "}
                {isRequired && <span className="required">*</span>}
            </label>

            <div className="input-field_wrapper">
                <input
                    placeholder={placeholder}
                    type={inputType}
                    required={isRequired}
                    onChange={onChange}
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