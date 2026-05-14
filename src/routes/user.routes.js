import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
    getCurrentUser,
    getUserPublicProfile,
    getUserPublishedBlogs,
    updateAccountDetails,
    updateUserAvatar,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
const router = Router();
// /me

// Authenticated self routes
// GET /users/me
// PATCH /users/me
router
.route("/me")
.get(verifyJwt, getCurrentUser)
.patch(verifyJwt, updateAccountDetails); // user profile update route with email and name and password update with current password verification
router
.route("/me/avatar", updateUserAvatar)
.patch(verifyJwt, upload.single("avatar"), updateUserAvatar);

// GET /users/me/blogs
router.route("/me/blogs").get(verifyJwt, getUserPublishedBlogs);

// Public routes
// GET /users/:username
router
.route("/:username")
.get(getUserPublicProfile);

// GET /users/:username/blogs
router.route("/:username/blogs").get(getUserPublishedBlogs);
// router.get("/:username", getUserPublicProfile); // user public profile with his blogs with folowers and following count and blogs count
export default router;
