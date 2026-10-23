import "./../../styles/input/showInput.css";

function ShowInput({ isVisible, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isVisible ? "Hide password" : "Show password"}
            title={isVisible ? "Hide password" : "Show password"}
        >
            {isVisible ? <img src="/eye_off.svg"/> : <img src="/eye_on.svg"/>}
        </button>
    );
}

export default ShowInput;