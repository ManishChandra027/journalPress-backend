import mongoose, { Schema, model } from "mongoose";

const followSchema = new Schema(
    {
        follower: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        following: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// prevent duplicate follows
followSchema.index({ follower: 1, following: 1 }, { unique: true });

followSchema.index({ following: 1 });

// prevent self-follow
followSchema.pre("save", function () {
    if (this.follower.equals(this.following)) {
        return new Error("Users cannot follow themselves");
    }
});

export const Follow = model("Follow", followSchema);
