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
        },

        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
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

        gifUrl: {
            type: String,
        },

        gifId: {
            type: String,
        },

        systemType: {
            type: String,
            enum: ["member-left"],
        },

        delivered: {
            type: Boolean,
            default: false,
        },

        read: {
            type: Boolean,
            default: false,
        },

        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    }
);

messageSchema.pre("validate", function () {
    const hasReceiver = Boolean(this.receiverId);
    const hasGroup = Boolean(this.groupId);

    if (hasReceiver === hasGroup) {
        this.invalidate(
            "receiverId",
            "Exactly one of receiverId or groupId is required"
        );
    }

});

const mod_message = mongoose.model(
    "Message",
    messageSchema
);

export default mod_message;