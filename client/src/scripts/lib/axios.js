import axios from "axios";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(
    /\/$/,
    ""
);

const isCapacitorApp =
    window.location.protocol === "capacitor:";

export const axiosInstance = axios.create({
    baseURL:
        import.meta.env.MODE === "development" ||
        isCapacitorApp
            ? `${serverUrl}/api`
            : "/api",
    withCredentials: true,
});
