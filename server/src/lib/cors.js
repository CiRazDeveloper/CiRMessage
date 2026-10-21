import "dotenv/config";

export const getAllowedOrigins = () => [
    process.env.VITE_SERVER_URL,
    process.env.VITE_URL,
    "http://localhost",
    "capacitor://localhost",
];