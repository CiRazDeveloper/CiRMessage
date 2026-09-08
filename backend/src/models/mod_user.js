import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
    displayName:{
        type: String,
        required: true,
        unique: false
    },
    username:{
        type: String,
        required: true,
        unique: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    secret:{
        type: String,
        required: true,
        minlength: 12
    },
    password:{
        type: String,
        required: true,
        unique: false,
        minlength: 8
    },
    profilePicture:{
        type: String,
        default: ""
    },
}, 
{ 
    timestamps: true
});

const mod_user = mongoose.model("User", userSchema);

export default mod_user;