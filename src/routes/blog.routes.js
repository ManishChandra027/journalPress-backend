// TODO add veriftjwt and requiredjwt protect route
import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
    createBlog,
    getBlogBySlug,
    getMyBlogs,
    getPublishedBlogs,
    restoreAllBlog,
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
    addComment,
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

//TODO add tags on routes
const router = Router();
router
    .route("/")
    .get(validate(blogQuerySchema, "query"), getPublishedBlogs)
    .post(
        verifyJwt,
        upload.single("coverImage"),
        validate(createBlogSchema),
        createBlog
    );

// /blogs/me?status=draft&page=1&sort=latest
router
    .route("/me")
    .get(verifyJwt, validate(blogQuerySchema, "query"), getMyBlogs); // agar status pass nhi kia to draft+published all

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
router.route("/me/restore-all").patch(verifyJwt, restoreAllBlog);
router.route("/me/delete-all").delete(verifyJwt, softDeleteAllBlogs);

router.route("/:slug").get(validate(slugParamSchema, "params"), getBlogBySlug);

router
    .route("/:id/status")
    .patch(verifyJwt, validate(statusBodySchema), updateBlogStatus);

// --------------like,bookmark,view-----------------
router.route("/:blogId/like").post(verifyJwt, toggleLikeBlog);
router.route("/:blogId/bookmark").post(verifyJwt, toggleBookmarkBlog);

// --------------Comments-----------------

router
    .route("/:blogId/comments")
    .get(getBlogComments)
    .post(validate(commentSchema), addComment);
router
    .route("/:blogId/comments/:commentId")
    .patch(validate(commentSchema), updateComment)
    .delete(deleteComment);

export default router;
