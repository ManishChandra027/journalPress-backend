import mongoose, { Schema, model } from "mongoose";

const commentSchema = new Schema(
    {
        content: { type: String, required: true, trim: true },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true,
        },
    },
    { timestamps: true }
);

//for fetching comments of a post in descending order
commentSchema.index({ post: 1, createdAt: -1 });

const Comment = model("Comment", commentSchema);
export default Comment
