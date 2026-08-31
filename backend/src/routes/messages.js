import express from "express";

// --- CONFIGURATIONS ---
const router = express.Router();

// --- GET METHODS ---
router.get("/send", (req, res) => {
    res.send("Send message endpoint");
});


export default router;