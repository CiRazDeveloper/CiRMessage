import "dotenv/config";
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

const SALT_LENGTH = Number(process.env.SALT_LENGTH);
const KEY_LENGTH = Number(process.env.KEY_LENGTH);

/**
 * Hash a password using scrypt.
 */
export const hashPassword = async (password) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");

    const hash = await scrypt(password, salt, KEY_LENGTH);

    return `${salt}:${hash.toString("hex")}`;
};

/**
 * Check whether a password matches a stored hash.
 */
export const verifyPassword = async (password, storedHash) => {
    const [salt, originalHash] = storedHash.split(":");

    if (!salt || !originalHash) {
        return false;
    }

    const hash = await scrypt(password, salt, KEY_LENGTH);

    const originalHashBuffer = Buffer.from(originalHash, "hex");

    if (originalHashBuffer.length !== hash.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        originalHashBuffer,
        hash
    );
};
