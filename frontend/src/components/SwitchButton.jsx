import "./../styles/switch_button.css";

function SwitchButton({ checked, onChange }) {
    return (
        <div className="switch">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
            />
            <span className="slider"></span>
        </div>
    );
}

export default SwitchButton;