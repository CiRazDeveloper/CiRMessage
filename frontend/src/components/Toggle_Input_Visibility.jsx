import { useState } from "react";

function useToggleInputVisibility() {
    const [showInput, setShowInput] = useState(false);

    const toggleVisibility = () => {
        setShowInput((previous) => !previous);
    };

    return {
        showInput,
        toggleVisibility,
    };
}

export default useToggleInputVisibility;