import Comment from "../models/comment.model.js";
import Post from "../models/posts.model.js";
import ApiError from "../utils/ApiError.js";

/*
|--------------------------------------------------------------------------
| Add Comment
|--------------------------------------------------------------------------
*/

const addComment = async ({ postId, comment, userId }) => {
    
    if (!postId) {
        throw new ApiError(400, "Post id is required");
    }

    if (!comment?.trim()) {
        throw new ApiError(400, "Comment is required");
    }

    const post = await Post.findOne({
        _id: postId,
        isDeleted: false,
        status: "published",
    });

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const newComment = await Comment.create({
        content: comment.trim(),
        user: userId,
        post: postId,
    });

    return newComment;
};

/*
|--------------------------------------------------------------------------
| Get Post Comments
|--------------------------------------------------------------------------
*/

const getPostComments = async (postId) => {
    if (!postId) {
        throw new ApiError(400, "Post id is required");
    }

    const post = await Post.findOne({
        _id: postId,
        isDeleted: false,
        status: "published",
    });

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const comments = await Comment.find({
        post: postId,
    })
        .populate("user", "fullName username avatar")
        .sort({
            createdAt: -1,
        });

    return comments;
};

/*
|--------------------------------------------------------------------------
| Update Comment
|--------------------------------------------------------------------------
*/

const updateComment = async ({
    commentId,
    comment,
    userId,
}) => {
    if (!commentId) {
        throw new ApiError(400, "Comment id is required");
    }

    if (!comment?.trim()) {
        throw new ApiError(400, "Comment is required");
    }

    const existingComment = await Comment.findById(commentId);

    if (!existingComment) {
        throw new ApiError(404, "Comment not found");
    }

    /*
     * Authorization:
     * Only comment owner can update it.
     */
    if (!existingComment.user.equals(userId)) {
        throw new ApiError(403, "Unauthorized user");
    }

    existingComment.content = comment.trim();

    await existingComment.save({
        validateBeforeSave: false,
    });

    return existingComment;
};

/*
|--------------------------------------------------------------------------
| Delete Comment
|--------------------------------------------------------------------------
*/

const deleteComment = async ({
    commentId,
    userId,
}) => {
    if (!commentId) {
        throw new ApiError(400, "Comment id is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    /*
     * Authorization:
     * Only comment owner can delete it.
     */
    if (!comment.user.equals(userId)) {
        throw new ApiError(403, "Unauthorized user");
    }

    await Comment.findByIdAndDelete(commentId);
};

export {
    addComment,
    getPostComments,
    updateComment,
    deleteComment,
};