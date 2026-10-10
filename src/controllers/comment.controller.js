import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
    addComment,
    getPostComments,
    updateComment,
    deleteComment,
} from "../services/comment.service.js";

/*
|--------------------------------------------------------------------------
| Add Comment
|--------------------------------------------------------------------------
*/

const createComment = asyncHandler(async (req, res) => {
    const { comment } = req.body;
    const { postId } = req.params;

    const userId = req.user._id;

    const newComment = await addComment({
        postId,
        comment,
        userId,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newComment, "Comment added successfully"));
});

/*
|--------------------------------------------------------------------------
| Get Post Comments
|--------------------------------------------------------------------------
*/

const getComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const comments = await getPostComments(postId);

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

/*
|--------------------------------------------------------------------------
| Update Comment
|--------------------------------------------------------------------------
*/

const editComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { comment } = req.body;

    const userId = req.user._id;

    const updatedComment = await updateComment({
        commentId,
        comment,
        userId,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );
});

/*
|--------------------------------------------------------------------------
| Delete Comment
|--------------------------------------------------------------------------
*/

const removeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const userId = req.user._id;

    await deleteComment({
        commentId,
        userId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export { createComment, getComments, editComment, removeComment };
