import "dotenv/config";
import jwt from "jsonwebtoken"

export const generateToken = (userId, res) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const NODE_ENV = process.env.NODE_ENV;

    if (!JWT_SECRET) {
        throw new Error("JWT_SECRENT is not configured");
    }

    const token = jwt.sign({ userId: userId}, JWT_SECRET, {
        expiresIn: "7d"
    });

    res.cookie("jwt", token, {
       maxAge: 7 * 24 * 60 * 60 * 1000,
       httpOnly: true, // prevent XSS attacks: cross-site scripting
       sameSite: "strict", // prevent CSRF attacks
       secure: NODE_ENV === "development" ? false : true
    });

    return token;
}