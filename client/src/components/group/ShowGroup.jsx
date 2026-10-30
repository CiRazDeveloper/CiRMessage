import "./../../styles/components/group/showGroup.css";

function GroupButton({ onToggle, img }) {
    return (
        <button
            type="button"
            id="show-group_btn"
            onClick={onToggle}
        >
            <img src={img}/>
        </button>
    );
}

export default GroupButton;