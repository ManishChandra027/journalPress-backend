import { Router } from "express";
import {
    forgotPassword,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    requestEmailVerification,
    resetPassword,
    updatePassword,
    verifyEmail,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.middleware.js";

const router = Router();
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);
//secured routes
router.route("/logout").post(verifyJwt,  requireVerifiedUser,logoutUser);
router.route("/refresh-token").post(verifyJwt, refreshAccessToken); //accessToken refresh
router.route("/change-password").post(verifyJwt,updatePassword);

router.route("/request-email-verification").post(verifyJwt, requestEmailVerification);
router.route("/verify-email/:token").post(verifyJwt,verifyEmail);
export default router;
