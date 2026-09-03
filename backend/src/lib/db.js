import "dotenv/config";
import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const user = encodeURIComponent(process.env.MONGO_USER);
        const password = encodeURIComponent(process.env.MONGO_PASSWORD);
        const host = process.env.MONGO_HOST;
        const port = process.env.MONGO_PORT;
        const database = process.env.MONGO_DB;

        const uri =
            `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=${database}`;

        const db = await mongoose.connect(uri);

        console.log(`Connected to MongoDB: ${db.connection.host}`);
    } catch (error) {
        console.error("Connecting to MongoDB failed:", error);
        throw error;
    }
};