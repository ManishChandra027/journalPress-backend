import { Router } from "express";
import {
    optionalVerifyJwt,
    verifyJwt,
} from "../middlewares/auth.middleware.js";
import {
    followUser,
    getCurrentUser,
    getUserFollowers,
    getUserFollowing,
    getUserPublicProfile,
    getUserPublishedBlogs,
    unfollowUser,
    updateAccountDetails,
    updateUserAvatar,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
const router = Router();
// /me

// Authenticated self routes
// GET /users/me
// PATCH /users/me
// TODO static routes sould be moove to top before dynamic routes to avoid route conflicts
router
    .route("/me")
    .get(verifyJwt, getCurrentUser)
    .patch(verifyJwt, updateAccountDetails); // user profile update route with email and name and password update with current password verification
router
    .route("/me/avatar")
    .patch(verifyJwt, upload.single("avatar"), updateUserAvatar);

// GET /users/me/blogs
router.route("/me/blogs").get(verifyJwt, getUserPublishedBlogs);

// Public routes
// GET /users/:username
router.route("/:username").get(getUserPublicProfile);

// GET /users/:username/blogs
router.route("/:username/blogs").get(getUserPublishedBlogs);
// router.get("/:username", getUserPublicProfile); // user public profile with his blogs with folowers and following count and blogs count

// follow system
// POST /users/:username/follow
router
    .route("/:username/follow")
    .post(verifyJwt, followUser)
    .delete(verifyJwt, unfollowUser); // follow and unfollow route with username

// GET /users/:username/followers?page=1&limit=10
router.route("/:username/followers").get(optionalVerifyJwt, getUserFollowers);
// GET /users/:username/following
router.route("/:username/following").get(optionalVerifyJwt, getUserFollowing);

export default router;
