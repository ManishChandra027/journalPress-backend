import { Router } from "express";
import { optionalVerifyJwt, verifyJwt } from "../middlewares/auth.middleware.js";
import {
    createBlog,
    getBlogBySlug,
    getFeatureBlog,
    getMyBlogs,
    getPublishedBlogs,
    restoreAllBlogs,
    restoreBlog,
    softDeleteAllBlogs,
    softDeleteBlog,
    toggleBookmarkBlog,
    toggleLikeBlog,
    updateBlog,
    updateBlogStatus,
} from "../controllers/blog.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    addComments,
    deleteComment,
    getBlogComments,
    updateComment,
} from "../controllers/comment.controller.js";
import validate from "../middlewares/validate.middleware.js";
import {
    blogQuerySchema,
    createBlogSchema,
    slugParamSchema,
    statusBodySchema,
    updateBlogSchema,
} from "../validations/blog.validation.js";
import { commentSchema } from "../validations/comment.validation.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.middleware.js";

//TODO add tags on routes
const router = Router();

router
    .route("/")
    .get(validate(blogQuerySchema, "query"), getPublishedBlogs)
    .post(
        verifyJwt,
        requireVerifiedUser,
        upload.single("coverImage"),
        validate(createBlogSchema),
        createBlog
    );

// /blogs/me?status=draft&page=1&sort=latest
router
    .route("/me")
    .get(verifyJwt, validate(blogQuerySchema, "query"), getMyBlogs); // agar status pass nhi kia to draft+published all

router.route("/me/restore-all").patch(verifyJwt, restoreAllBlogs);

router.route("/me/delete-all").delete(verifyJwt, softDeleteAllBlogs);

router
    .route("/id/:id")
    .patch(
        verifyJwt,
        upload.single("coverImage"),
        validate(updateBlogSchema),
        updateBlog
    )
    .delete(verifyJwt, softDeleteBlog);

router.route("/me/:id/restore").patch(verifyJwt, restoreBlog);

router
    .route("/:id/status")
    .patch(verifyJwt, validate(statusBodySchema), updateBlogStatus);

router
    .route("/:blogId/comments/:commentId")
    .patch(verifyJwt, validate(commentSchema), updateComment)
    .delete(verifyJwt, deleteComment);

router.route("/:blogId/like").post(verifyJwt, toggleLikeBlog);

router.route("/:blogId/bookmark").post(verifyJwt, toggleBookmarkBlog);

router
    .route("/:blogId/comments")
    .get(getBlogComments)
    .post(verifyJwt, validate(commentSchema), addComments);

router.route("/slug/:slug").get(optionalVerifyJwt, validate(slugParamSchema, "params"), getBlogBySlug);

router.route("/featured").get(getFeatureBlog)
export default router;
