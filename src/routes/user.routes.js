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

//req authenticated routes
router
    .route("/me")
    .get(verifyJwt, getCurrentUser)
    .patch(verifyJwt, updateAccountDetails); // user profile update route with email and name and password update with current password verification
router
    .route("/me/avatar", updateUserAvatar)
    .patch(verifyJwt, upload.single("avatar"), updateUserAvatar);

router.get("/:username/blogs", verifyJwt, getUserPublishedBlogs); // user published blogs
router.get("/:username", verifyJwt, getUserPublicProfile); // user public profile with his blogs with folowers and following count and blogs count

export default router;
