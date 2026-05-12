import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import generateResetToken from "../utils/generateResetToken.js";
import sendEmail from "../utils/sendEmail.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();

        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            `Something went wrong while generating accessand refresh tokens: ${error}`
        );
    }
};

const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
};

const registerUser = asyncHandler(async (req, res) => {
    //get data from user
    const { username, email, password, fullName, bio } = req.body;
    //validate data
    if (
        [fullName, email, username, password].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "all fields are required");
    }
    //check user already in db
    const isUserExist = await User.findOne({
        $or: [{ email }, { username }],
    });
    if (isUserExist) {
        throw new ApiError(409, "User with email or username already exist");
    }
    //check avatar
    const avatarLocalPath = req.file?.path;
    let avatarUrl = "";
    if (avatarLocalPath) {
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar)
            throw new ApiError(400, "error during uplode on Cloudinary");
        avatarUrl = avatar.url;
    }
    //save data in db
    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        bio,
        avatar: avatarUrl,
    });
    //generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );
    const registeredUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!registeredUser)
        throw new ApiError(401, "User not registred ,somthing wrong");

    //retuen user
    res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                { user: registeredUser, accessToken },
                "User Registred Successfully"
            )
        );
});

const loginUser = asyncHandler(async (req, res) => {
    //get data from user
    const { username, email, password } = req.body;
    //validate data
    if (username && email) {
        throw new ApiError(400, "username or email fields are required");
    }
    if (!password) throw new ApiError(400, "password is required");
    //check user already in db
    const user = await User.findOne({
        $or: [{ email }, { username }],
    });
    if (!user) {
        throw new ApiError(409, "User does't exist ,plz regestired first");
    }
    //check pass
    const isPassValid = await user.isPasswordValid(password);
    if (!isPassValid) throw new ApiError(401, "Password does not correct");
    //generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );
    const loginUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!loginUser) throw new ApiError(401, "User not login ,somthing wrong");

    //retuen user
    res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                { user: loginUser, accessToken },
                "User Login Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, {
        $unset: { refreshToken: 1 },
    });
    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    //get token from user from cookie or body
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }
    //verify from jwt
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );
    if (!decodedToken) throw new ApiError(401, "Invalid Refresh token");
    //check in db token is exist or not
    const user = await User.findById(decodedToken._id);
    if (!user || user.refreshToken !== incomingRefreshToken)
        throw new ApiError(401, "Invalid Refresh token");
    //send new refresh token to user
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Access token refreshed successfully"
            )
        );
});

const updatePassword = asyncHandler(async (req, res) => {
    //fetch detailed and validations
    const { currendPassword, updatedPassword } = req.body;
    if (
        !currendPassword ||
        !updatedPassword ||
        currendPassword.trim() === "" ||
        currendPassword.trim() === "" ||
        currendPassword.trim() === updatedPassword.trim()
    )
        throw new ApiError(
            401,
            "Current password and new password are required and should not be same"
        );
    //

    // find user in db
    const user = await User.findById(req.user._id);
    const isCurrentPasswordValid = await user.isPasswordValid(currendPassword);
    if (!isCurrentPasswordValid)
        throw new ApiError(401, "Current password is incorrect");
    //save new pass in db
    user.password = updatedPassword;
    user.save({ ValidateBeforeSave: false });
    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password changed successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "email address is required");
    const user = await User.findOne({ email });
    // Security: user mile ya na mile, same response
    if (!user) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    201,
                    null,
                    "If an account exists, a reset link has been sent."
                )
            );
    }
    //generate token
    const { rawToken, hashedToken } = generateResetToken();
    //save in db
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });
    // create Reset URL ,
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${rawToken}`; //raw token user send this url to us
    //send to mail
    try {
        await sendEmail({
            to: user.email,
            subject: "Password Reset Request",
            html: `
                <h2>Password Reset</h2>
                <p>This link will expire in 30 minutes.</p>
                <a href="${resetURL}">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
                `,
        });
    } catch (emailError) {
        // Email fail — DB clean
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        throw new ApiError(
            500,
            "Unable to send the email at the moment. Please try again later."
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "If an account exists, a reset link has been sent."
            )
        );
});

const resetPassword = asyncHandler(async (req, res) => {
    //get token
    const { token } = req.params;
    const { newPassword } = req.body;
    if (!token || !newPassword)
        throw new ApiError(400, "Token and new password are required");
    //hash token to compare with db token because we save hashed token in db and user send us raw token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    // find user by hashed token with expire
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
        throw new ApiError(400, "Invalid or expired password reset token");
    //update new pass in db
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Security: invalidate all existing sessions by removing refresh token
    //after reset password user must have to login again so we will remove refresh token from db and cookie
    await user.save();
    res.status(200).json(
        new ApiResponse(200, null, "Password reset successfully")
    );
});

const requestEmailVerification = asyncHandler(async (req, res) => {
    //  Logged in user — req.user middleware se aayega
    const user = await User.findById(req.user._id);
    if (user.isVerified) throw new ApiError(400, "Email is already verified");
    //generate token
    const { rawToken, hashedToken } = generateResetToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });
    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;
    //send to mail
    try {
        await sendEmail({
            to: user.email,
            subject: "Email Verify Request",
            html: `
               <h2>Email Verification</h2>
          <p>Apna email verify karo taaki tum blog post, comment
          aur subscribe kar sako.</p>
          
            href="${verifyURL}"
            style="
              background:#4F46E5;
              color:white;
              padding:12px 24px;
              border-radius:6px;
              text-decoration:none;
            "
          >
            Verify Email
          </a>
          <p>Ye link 24 hours mein expire hoga.</p>
        `,
        });
    } catch (emailError) {
        // Email fail — DB clean
        user.emailVerificationToken = undefined;
        user.emailVerificationToken = undefined;
        await user.save({ validateBeforeSave: false });

        throw new ApiError(
            500,
            "Unable to send the email at the moment. Please try again later."
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "If an email exists, a verify link has been sent."
            )
        );
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw new ApiError(400, "Token and new password are required");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
   
     const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() },
    });
    if (!user)
        throw new ApiError(400, "Invalid or expired password reset token");
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    res.status(200).json(
        new ApiResponse(200, null, "Email verified successfully")
    );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updatePassword,
    forgotPassword,
    resetPassword,
    requestEmailVerification,
    verifyEmail,

};
