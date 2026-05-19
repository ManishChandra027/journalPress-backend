// TODO add veriftjwt and requiredjwt protect route

import { Router } from "express";
import {
    changeEmailRequest,
    forgotPassword,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    requestEmailVerification,
    resetPassword,
    updatePassword,
    verifyEmail,
} from "../controllers/auth.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { changeEmailSchema, changePasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../validations/auth.validation.js";

const router = Router();
router.route("/register").post(upload.single("avatar"),validate(registerSchema), registerUser);
router.route("/login").post(validate(loginSchema),loginUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(validate(resetPasswordSchema),resetPassword);
//secured routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(verifyJwt, refreshAccessToken); //accessToken refresh
router.route("/change-password").post(verifyJwt,validate(changePasswordSchema), updatePassword);

router
    .route("/request-email-verification")
    .post(verifyJwt, requestEmailVerification);
router.route("/verify-email/:token").post(verifyJwt, verifyEmail);
router.route("/change-email-request").post(verifyJwt,validate(changeEmailSchema), changeEmailRequest);

export default router;
