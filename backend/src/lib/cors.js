import "dotenv/config";

export const getAllowedOrigins = () => [
    process.env.CLIENT_URL,
    "http://localhost",
    "capacitor://localhost",
];