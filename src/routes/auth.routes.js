import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login");
router.route("/logout");
router.route("/refresh-token");
router.route("/forgot-password");
router.route("/reset-password");

export default router;
