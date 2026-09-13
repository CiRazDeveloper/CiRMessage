import "dotenv/config";

export const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost",
    "capacitor://localhost",
];