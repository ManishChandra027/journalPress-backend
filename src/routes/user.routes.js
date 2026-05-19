// TODO add veriftjwt and requiredjwt protect route

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
import validate from "../middlewares/validate.middleware.js";
import {
    paginationQuerySchema,
    updateAccountSchema,
    usernameParamSchema,
} from "../validations/user.validation.js";
import { blogQuerySchema } from "../validations/blog.validation.js";
const router = Router();
// /me

// Authenticated self routes
// GET /users/me
// PATCH /users/me
// TODO static routes sould be moove to top before dynamic routes to avoid route conflicts
router
    .route("/me")
    .get(verifyJwt, getCurrentUser)
    .patch(verifyJwt, validate(updateAccountSchema), updateAccountDetails); // user profile update route with email and name and password update with current password verification
router
    .route("/me/avatar")
    .patch(verifyJwt, upload.single("avatar"), updateUserAvatar);

// GET /users/me/blogs
// router.route("/me/blogs").get(verifyJwt, getUserPublishedBlogs);

// Public routes
// GET /users/:username
router
    .route("/:username")
    .get(validate(usernameParamSchema,"params"), getUserPublicProfile);

// GET /users/:username/blogs
router
    .route("/:username/blogs")
    .get(validate(usernameParamSchema,'params'),validate(blogQuerySchema,"query"), getUserPublishedBlogs);


// follow system
// POST /users/:username/follow
router
    .route("/:username/follow")
    .post(verifyJwt, validate(usernameParamSchema,"params"), followUser)
    .delete(verifyJwt, validate(usernameParamSchema,"params"), unfollowUser); // follow and unfollow route with username

// GET /users/:username/followers?page=1&limit=10
router
    .route("/:username/followers")
    .get(
        optionalVerifyJwt,
        validate(usernameParamSchema,"params"),
        validate(paginationQuerySchema, "query"),
        getUserFollowers
    );
// GET /users/:username/following
router
    .route("/:username/following")
    .get(
        optionalVerifyJwt,
        validate(usernameParamSchema,"params"),
        validate(paginationQuerySchema, "query"),
        getUserFollowing
    );

export default router;
