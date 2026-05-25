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


const Like = model("Like", likeSchema);

export default Like;
