import mongoose, { Schema, model } from "mongoose";

const commentSchema = new Schema(
    {
        content: { type: String, required: true, trim: true },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        blog: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Blog",
            required: true,
        },
    },
    { timestamps: true }
);

//for fetching comments of a blog in descending order
commentSchema.index({ blog: 1, createdAt: -1 });

const Comment = model("Comment", commentSchema);
export default Comment
