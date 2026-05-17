import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
    createBlog,
    getBlogBySlug,
    getMyBlogs,
    getPublishedBlogs,
    incrementBlogView,
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

//TODO add tags on routes
const router = Router();
router
    .route("/")
    .get(getPublishedBlogs)
    .post(verifyJwt, upload.single("coverImage"), createBlog);

// /blogs/me?status=draft&page=1&sort=latest
router.route("/me").get(verifyJwt, getMyBlogs); // agar status pass nhi kia to draft+published all

router
    .route("/id/:id")
    .patch(verifyJwt, upload.single("coverImage"), updateBlog)
    .delete(verifyJwt, softDeleteBlog);

router.route("/me/:id/restore").patch(verifyJwt, restoreBlog);
router.route("/me/restore-all").patch(verifyJwt, restoreAllBlog);
router.route("/me/delete-all").delete(verifyJwt, softDeleteAllBlogs);

router.route("/:slug").get(getBlogBySlug);

router.route("/:id/status").patch(verifyJwt, updateBlogStatus);

// --------------like,bookmark,view-----------------
router.route("/:id/like").post(verifyJwt, toggleLikeBlog);
router.route("/:id/bookmark").post(verifyJwt, toggleBookmarkBlog);

// --------------Comments-----------------

router.route("/:blogId/comments").get(getBlogComments).post(addComment);
router.route("/:blogId/comments/:commentId").patch(upda).delete(deleteComment);

export default router;
