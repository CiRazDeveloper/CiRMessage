
export function getAllowedOrigins() {
    const origins = process.env.CLIENT_ORIGIN
        || process.env.VITE_URL
        || "http://localhost:2206";

    return origins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}
