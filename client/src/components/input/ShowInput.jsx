import "./../../styles/general.css";
import "./../../styles/components/input/showInput.css";

import eyeOpen from "./../../assets/eyeOpen.svg";
import eyeShut from "./../../assets/eyeShut.svg";

function ShowInput({ isVisible, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isVisible ? "Hide password" : "Show password"}
            title={isVisible ? "Hide password" : "Show password"}
        >
            {isVisible ? <img src={eyeShut}/> : <img src={eyeOpen}/>}
        </button>
    );
}

export default ShowInput;