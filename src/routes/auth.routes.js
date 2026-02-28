import { Router } from "express";
import { registerUser, loginUser,getCurrentUser,UpdateProfile, logoutUser, verifyEmail, refreshAccessToken, forgotPassword, resetForgotPassword, changeCurrentPassword, resendEmailVerification, googleCallback, googleAuth } from "../controllers/auth.controller.js";
import { ValidationMiddleware, passwordValidator } from '../middlewares/validationMiddleware.js';
import { auth } from "../middlewares/authMiddleware.middlewares.js";
import { upload } from "../middlewares/multerMiddleware.middlewares.js";

const router = Router();

router.route("/register").post(ValidationMiddleware, registerUser);
router.route("/login").post(loginUser);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:resetToken").post(passwordValidator, resetForgotPassword);
router.route("/google").get(googleAuth)
router.route("/get/me").get(auth, getCurrentUser);
router.route("/google/callback").get(googleCallback)
// protected route
router.route("/logout").post(auth, logoutUser);
// router.route("/current-user").get(auth, getCurrentUser);
router.route("/changed-password").post(passwordValidator, auth, changeCurrentPassword);
router.route("/resend-email-verification").post(auth, resendEmailVerification);
router.route("/UpdateProfile").post(auth, upload.single("avatar"), UpdateProfile);
export default router;