import { axiosInstance } from "../lib/axios";
import {
    saveUser,
    removeUser,
    setIsCheckingAuth
} from "../storage.js";

export const checkAuth = async () => {
    try {
        const response = await axiosInstance.get("/auth/check");

        saveUser(response.data);

        return true;
    } catch (error) {
        console.log("Error in checkAuth:", error);

        removeUser();

        return false;
    } finally {
        setIsCheckingAuth(false);
    }
};
