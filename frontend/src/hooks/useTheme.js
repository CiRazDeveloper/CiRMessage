import { useEffect, useState } from "react";

export function useTheme() {
    const [themeMode, setThemeMode] = useState(
        () => localStorage.getItem("themeMode") || "system"
    );

    const [systemTheme, setSystemTheme] = useState(() =>
        window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
    );

    const resolvedTheme =
        themeMode === "system" ? systemTheme : themeMode;

    useEffect(() => {
        localStorage.setItem("themeMode", themeMode);
    }, [themeMode]);

    useEffect(() => {
        const mediaQuery = window.matchMedia(
            "(prefers-color-scheme: dark)"
        );

        const updateSystemTheme = (event) => {
            setSystemTheme(event.matches ? "dark" : "light");
        };

        mediaQuery.addEventListener("change", updateSystemTheme);

        return () => {
            mediaQuery.removeEventListener("change", updateSystemTheme);
        };
    }, []);

    return {
        themeMode,
        setThemeMode,
        systemTheme,
        resolvedTheme,
    };
}