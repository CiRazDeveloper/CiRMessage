import "./../styles/textInput.css";

function TextInput(props) {
    return (
        <div className="text-input">
            <input {...props} />
        </div>
    );
}

export default TextInput;
