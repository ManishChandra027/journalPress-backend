import { Router } from "express";
import { optionalVerifyJwt, verifyJwt } from "../middlewares/auth.middleware.js";
import {
    createPost,
    getPostBySlug,
    getFeaturePost,
    getMyPosts,
    getPublishedPosts,
    restoreAllPosts,
    restorePost,
    softDeleteAllPosts,
    softDeletePost,
    toggleBookmarkPost,
    toggleLikePost,
    updatePost,
    updatePostStatus,
    checkPostLiked,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    createComment,
    removeComment,
    getComments,
    editComment,
} from "../controllers/comment.controller.js";
import validate from "../middlewares/validate.middleware.js";
import {
    postQuerySchema,
    createPostSchema,
    slugParamSchema,
    statusBodySchema,
    updatePostSchema,
} from "../validations/post.validation.js";
import { commentSchema } from "../validations/comment.validation.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.middleware.js";

//TODO add tags on routes
const router = Router();

router
    .route("/")
    .get(validate(postQuerySchema, "query"), getPublishedPosts)
    .post(
        verifyJwt,
        requireVerifiedUser,
        upload.single("coverImage"),
        validate(createPostSchema),
        createPost
    );

// /posts/me?status=draft&page=1&sort=latest
router
    .route("/me")
    .get(verifyJwt, validate(postQuerySchema, "query"), getMyPosts); // agar status pass nhi kia to draft+published all

router.route("/me/restore-all").patch(verifyJwt, restoreAllPosts);

router.route("/me/delete-all").delete(verifyJwt, softDeleteAllPosts);

router
    .route("/id/:id")
    .patch(
        verifyJwt,
        upload.single("coverImage"),
        validate(updatePostSchema),
        updatePost
    )
    .delete(verifyJwt, softDeletePost);

router.route("/me/:id/restore").patch(verifyJwt, restorePost);

router
    .route("/:id/status")
    .patch(verifyJwt, validate(statusBodySchema), updatePostStatus);

router
    .route("/:postId/comments/:commentId")
    .patch(verifyJwt, validate(commentSchema), editComment)
    .delete(verifyJwt, removeComment);

router.route("/:postId/like").post(verifyJwt, toggleLikePost);

router.route("/:postId/bookmark").post(verifyJwt, toggleBookmarkPost);

router
    .route("/:postId/comments")
    .get(getComments)
    .post(verifyJwt, validate(commentSchema), createComment);

router.route("/slug/:slug").get(optionalVerifyJwt, validate(slugParamSchema, "params"), getPostBySlug);

router.route("/featured").get(getFeaturePost)
//create route to check user liked that post or not
router.route("/:postId/liked").get(verifyJwt,checkPostLiked)
export default router;
