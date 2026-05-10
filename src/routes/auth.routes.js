import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);
//secured routes
router.route("/logout").post(verifyJwt,logoutUser);
router.route("/refresh-token");
router.route("/forgot-password");
router.route("/reset-password");

export default router;
