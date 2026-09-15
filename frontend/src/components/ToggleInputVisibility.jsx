import { useState } from "react";

function ToggleInputVisibility() {
    const [showInput, setShowInput] = useState(false);

    const toggleVisibility = () => {
        setShowInput((previous) => !previous);
    };

    return {
        showInput,
        toggleVisibility,
    };
}

export default ToggleInputVisibility;