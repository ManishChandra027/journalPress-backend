import mongoose, { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        fullName: { type: String, required: true, trim: true },

        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: { type: String, required: [true, "Password is required"] },

        avatar: {
            url: {
                type: String,
                default: "",
            },
            public_id: {
                type: String,
                default: "",
            },
        },

        bio: { type: String, default: "" ,maxlength: 300},

        role: { type: String, enum: ["user", "admin"], default: "user" },

        isVerified: { type: Boolean, default: false },

        refreshToken: { type: String },
        passwordResetToken: { type: String }, // hashed token store hoga
        passwordResetExpires: { type: Date }, // expiry

        emailVerificationToken: { type: String }, // hashed token store hoga
        emailVerificationExpires: { type: Date }, // expiry

        // ai feature  for future
        aiPreferences: {
            type: {
                preferredTone: String, // "formal", "casual", "technical"
                topics: [String],
            },
            default: null,
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordValid = async function (password) {
    return await bcrypt.compare(password, this.password); //return true/false
};
userSchema.methods.generateAccessToken = async function () {
    const paylode = {
        _id: this._id,
        username: this.username,
        email: this.email,
        role: this.role,
    };
    return await jwt.sign(paylode, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    });
};
userSchema.methods.generateRefreshToken = async function () {
    return await jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    });
};

const User = model("User", userSchema);
export { User };
