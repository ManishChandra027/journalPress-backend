import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

import * as postService from "../services/post.service.js";


// ================= CREATE POST =================

const createPost = asyncHandler(async (req, res) => {

    
    const post = await postService.createPost({
        body: req.body,
        user: req.user,
        file: req.file,
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            post,
            "Post Created Successfully"
        )
    );
});


// ================= GET PUBLISHED POSTS =================

const getPublishedPosts = asyncHandler(async (req, res) => {
    const {
        page,
        limit,
        sort,
        category,
        search,
    } = req.validated.query;

    const result =
        await postService.getPublishedPosts({
            page,
            limit,
            sort,
            category,
            search,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Published posts fetched successfully"
        )
    );
});


// ================= GET MY POSTS =================

const getMyPosts = asyncHandler(async (req, res) => {
    const {
        page,
        limit,
        sort,
        category,
        search,
        status,
    } = req.validated.query;

    const result =
        await postService.getMyPosts({
            page,
            limit,
            sort,
            category,
            search,
            status,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Published posts fetched successfully"
        )
    );
});


// ================= GET POST BY SLUG =================

const getPostBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.validated.params;

    const post =
        await postService.getPostBySlug({
            slug,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post fetched successfully"
        )
    );
});


// ================= UPDATE POST STATUS =================

const updatePostStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    const post =
        await postService.updatePostStatus({
            id,
            status,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post status updated successfully"
        )
    );
});


// ================= SOFT DELETE POST =================

const softDeletePost = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const post =
        await postService.softDeletePost({
            id,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post softDelete successfully"
        )
    );
});


// ================= SOFT DELETE ALL POSTS =================

const softDeleteAllPosts = asyncHandler(async (req, res) => {
    const result =
        await postService.softDeleteAllPosts({
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "All posts deleted successfully"
        )
    );
});


// ================= RESTORE POST =================

const restorePost = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const post =
        await postService.restorePost({
            id,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post restored successfully"
        )
    );
});


// ================= RESTORE ALL POSTS =================

const restoreAllPosts = asyncHandler(async (req, res) => {
    const result =
        await postService.restoreAllPosts({
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Post restored successfully"
        )
    );
});


// ================= UPDATE POST =================

const updatePost = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const post =
        await postService.updatePost({
            id,
            body: req.body,
            file: req.file,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post updated successfully"
        )
    );
});


// ================= TOGGLE LIKE =================

const toggleLikePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const result =
        await postService.toggleLikePost({
            postId,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            result.data,
            result.message
        )
    );
});


// ================= TOGGLE BOOKMARK =================

const toggleBookmarkPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const result =
        await postService.toggleBookmarkPost({
            postId,
            user: req.user,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            result.data,
            result.message
        )
    );
});


// ================= FEATURED POST =================

const getFeaturePost = asyncHandler(async (req, res) => {
    const post =
        await postService.getFeaturePost();

    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post fetched successfully"
        )
    );
});


// ================= CHECK POST LIKED =================

const checkPostLiked = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const result =
        await postService.checkPostLiked({
            userId: req.user._id,
            postId,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isLiked: result.isLiked,
            },
            result.message
        )
    );
});


export {
    createPost,
    getPublishedPosts,
    getMyPosts,
    getPostBySlug,
    updatePostStatus,
    updatePost,
    softDeletePost,
    softDeleteAllPosts,
    restoreAllPosts,
    restorePost,
    toggleLikePost,
    toggleBookmarkPost,
    getFeaturePost,
    checkPostLiked,
};