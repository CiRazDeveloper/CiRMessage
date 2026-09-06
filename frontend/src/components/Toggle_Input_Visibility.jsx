import { useState } from "react";

function toggleInputVisibility() {
  const [showInput, setShowInput] = useState(false);

  function toggleVisibility() {
    setShowInput(!showInput);
  }

  return {showInput, toggleVisibility};
}

export default toggleInputVisibility;
