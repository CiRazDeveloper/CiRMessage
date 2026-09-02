import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
    display_name:{
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
    password:{
        type: String,
        required: true,
        unique: false,
        minlength: 6
    },
    profile_picture:{
        type: String,
        default: ""
    },
}, 
{ 
    timestamps: true
});

const mod_user = mongoose.model("User", userSchema);

export default mod_user;