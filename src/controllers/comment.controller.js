import Comment from "../models/comment.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const addComment = asyncHandler(async (req, res) => {
    const { blogId } = req.params;

    let { comment } = req.body;

    const user = req.user;

    if (!blogId) {
        throw new ApiError(400, "Blog id is required");
    }

    // check blog exists
    const blog = await Blog.findOne({
        _id: blogId,
        isDeleted: false,
        status: "published",
    });

    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }

    // create comment
    const newComment = await Comment.create({
        content: comment,
        user: user._id,
        blog: blogId,
    });

    res.status(201).json(
        new ApiResponse(201, newComment, "Comment created successfully")
    );
});
const getBlogComments = asyncHandler(async (req, res) => {
    const { blogId } = req.params;

    if (!blogId) {
        throw new ApiError(400, "Blog id is required");
    }

    // check blog exists
    const blog = await Blog.findOne({
        _id: blogId,
        isDeleted: false,
        status: "published",
    });

    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }

    const comments = await Comment.find({
        blog: blogId,
    })
        .populate("user", "fullname username avatar")
        .sort({
            createdAt: -1,
        });

    res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched successfully")
    );
});
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    let { comment } = req.body;

    const user = req.user;

    if (!commentId) {
        throw new ApiError(400, "Comment id is required");
    }

    // find comment
    const existingComment = await Comment.findById(commentId);

    if (!existingComment) {
        throw new ApiError(404, "Comment not found");
    }

    // authorization
    if (!existingComment.user.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    // update
    existingComment.content = comment;

    await existingComment.save({
        validateBeforeSave: false,
    });

    res.status(200).json(
        new ApiResponse(200, existingComment, "Comment updated successfully")
    );
});
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const user = req.user;

    // validation
    if (!commentId) {
        throw new ApiError(400, "Comment id is required");
    }

    // find comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // authorization
    if (!comment.user.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    // delete
    await Comment.findByIdAndDelete(commentId);

    res.status(200).json(
        new ApiResponse(200, null, "Comment deleted successfully")
    );
});

export { addComment, getBlogComments, updateComment, deleteComment };
