import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.jsx";
import { NotificationProvider } from "./components/NotificationContext.jsx";
import NotificationContainer from "./components/NotificationContainer.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <NotificationProvider>
            <NotificationContainer />
            <App />
        </NotificationProvider>
    </StrictMode>
);