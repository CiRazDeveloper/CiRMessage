import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        text: {
            type: String,
        },

        media: {
            type: String,
        },

        mediaType: {
            type: String,
            enum: ["image", "video"],
        },

        mediaMimeType: {
            type: String,
        },

        delivered: {
            type: Boolean,
            default: false,
        },

        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const mod_message = mongoose.model(
    "Message",
    messageSchema
);

export default mod_message;