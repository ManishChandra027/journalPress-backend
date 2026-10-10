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
    getUserPublishedPosts,
    unfollowUser,
    updateAccountDetails,
    // updateUserAvatar,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import validate from "../middlewares/validate.middleware.js";
import {
    paginationQuerySchema,
    updateAccountSchema,
    usernameParamSchema,
} from "../validations/user.validation.js";
import { postQuerySchema } from "../validations/post.validation.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.middleware.js";

const router = Router();

router
    .route("/me")
    .get(verifyJwt, getCurrentUser)
    .patch(
        verifyJwt,
        upload.single("avatar"),
        validate(updateAccountSchema),
        updateAccountDetails
    );

// router
//     .route("/me/avatar")
//     .patch(verifyJwt, upload.single("avatar"), updateUserAvatar);

// GET /users/:username/posts
router
    .route("/:username/posts")
    .get(
        validate(usernameParamSchema, "params"),
        validate(postQuerySchema, "query"),
        getUserPublishedPosts
    );

// POST /users/:username/follow
router
    .route("/:username/follow")
    .post(verifyJwt, validate(usernameParamSchema, "params"), followUser)
    .delete(verifyJwt, validate(usernameParamSchema, "params"), unfollowUser); // follow and unfollow route with username

// GET /users/:username/followers?page=1&limit=10
router
    .route("/:username/followers")
    .get(
        optionalVerifyJwt,
        validate(usernameParamSchema, "params"),
        validate(paginationQuerySchema, "query"),
        getUserFollowers
    );

// GET /users/:username/following
router
    .route("/:username/following")
    .get(
        optionalVerifyJwt,
        validate(usernameParamSchema, "params"),
        validate(paginationQuerySchema, "query"),
        getUserFollowing
    );

// GET /users/:username
router
    .route("/:username")
    .get(
        verifyJwt,
        validate(usernameParamSchema, "params"),
        getUserPublicProfile
    );

export default router;
