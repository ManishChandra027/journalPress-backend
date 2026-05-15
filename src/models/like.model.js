import mongoose, { Schema, model } from "mongoose";

const likeSchema = new Schema(
    {
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
likeSchema.index({ blog: 1, createdAt: -1 });

const Like = model("Like", likeSchema);

export default Like;
