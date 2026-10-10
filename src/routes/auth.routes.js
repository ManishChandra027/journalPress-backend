import { Router } from "express";
import {
    // changeEmailRequest,
    forgotPassword,
    getCurrentUser,
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
import { verifyJwt, verifyRefreshToken } from "../middlewares/auth.middleware.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
    changeEmailSchema,
    changePasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
} from "../validations/auth.validation.js";
import { authRateLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.route("/me").get(verifyJwt, getCurrentUser);

router
    .route("/register")
    .post(validate(registerSchema),authRateLimiter,authRateLimiter, registerUser);

router.route("/login").post(validate(loginSchema),authRateLimiter, loginUser);

router.route("/forgot-password").post(authRateLimiter,forgotPassword);

router
    .route("/reset-password/:token")
    .post(validate(resetPasswordSchema),authRateLimiter, resetPassword);

//secured routes
router.route("/logout").post(verifyJwt, logoutUser);

router.route("/refresh-token").post(verifyRefreshToken,refreshAccessToken); //accessToken refresh

router
    .route("/change-password")
    .post(verifyJwt, validate(changePasswordSchema), authRateLimiter,updatePassword);

router
    .route("/request-email-verification")
    .post(verifyJwt, requestEmailVerification);

router.route("/verify-email/:token").post(verifyEmail);

// router
//     .route("/change-email-request")
//     .post(verifyJwt, validate(changeEmailSchema), changeEmailRequest);

export default router;
