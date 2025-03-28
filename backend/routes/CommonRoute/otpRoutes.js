import express from "express";
const router = express.Router();
import { otpController, verifyOtp } from "../../controllers/CommonController/otpController.js";

router.post("/send-otp", otpController);
router.post("/verify-otp", verifyOtp);

export default router;
