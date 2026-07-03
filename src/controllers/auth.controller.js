import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import generateTemporaryToken from "../utils/generateTemporaryToken.js";
import sendEmail from "../utils/sendEmail.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId).select("+refreshToken");
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
    const { username, email, password, fullName, bio } = req.body;

    const isUserExist = await User.findOne({
        $or: [{ email }, { username }],
    });
    if (isUserExist) {
        throw new ApiError(409, "User with email or username already exist");
    }

    const avatarLocalPath = req.file?.path;

    let avatarData = null;
    if (avatarLocalPath) {
        avatarData = await uploadOnCloudinary(avatarLocalPath);
        if (!avatarData?.url || !avatarData?.public_id)
            throw new ApiError(400, "error during uploade on Cloudinary");
    }
    const userData = {
        fullName,
        username,
        email,
        password,
    };

    if (avatarData) {
        userData.avatar = {
            url: avatarData.url,
            public_id: avatarData.public_id,
        };
    }
    if (bio) {
        userData.bio = bio;
    }

    const user = await User.create(userData);
    //generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );
    const registeredUser = await User.findById(user._id);
    if (!registeredUser)
        throw new ApiError(500, "User not registred ,somthing wrong");

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
    const { username, email, password } = req.body;
    if (!username && !email)
        throw new ApiError(400, "username or email is required");
    // check user in DB
    const user = await User.findOne({
        $or: [{ email }, { username }],
    }).select("+password +refreshToken");

    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    const isPassValid = await user.isPasswordValid(password);

    if (!isPassValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    // get sanitized user
    const loggedInUser = await User.findById(user._id);
    if (!loggedInUser) {
        throw new ApiError(500, "Failed to login user");
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                },
                "User logged in successfully"
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
    if (currendPassword === updatedPassword)
        throw new ApiError(
            401,
            "Current password and new password  should not be same"
        );

    // find user in db
    const user = await User.findById(req.user._id).select(
        "+password +refreshToken"
    );
    const isCurrentPasswordValid = await user.isPasswordValid(currendPassword);
    if (!isCurrentPasswordValid)
        throw new ApiError(401, "Current password is incorrect");

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
    // for Security: user mile ya na mile, same response
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

    const { rawToken, hashedToken } = generateTemporaryToken();

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });
    // create Reset URL ,
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${rawToken}`; //raw token user send this url to us
    //send to mail
    try {
        await sendEmail({
            to: user.email,
            subject: "Reset your Password",
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Email Verification</h2>

            <p>
                Thank you for registering on JournalPress.
                Please verify your email address to access all features,
                including publishing blogs, commenting, and subscriptions.
            </p>

            <a
                href="${resetURL}"
                style="
                    display: inline-block;
                    padding: 10px 18px;
                    background-color: #111827;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-top: 10px;
                    margin-bottom: 10px;
                "
            >
                Reset Password
            </a>

            <p>
                This verification link will expire in 24 hours.
            </p>

            <p>
                If you did not create this account, you can safely ignore this email.
            </p>
        </div>
    `,
        });
    } catch (emailError) {
        // Email fail — DB clean
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error(emailError);
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
    const { rawToken, hashedToken } = generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });
    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;
    //send to mail
    try {
        await sendEmail({
            to: user.email,
            subject: "Verify Your Email Address",
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Email Verification</h2>

            <p>
                Thank you for registering on JournalPress.
                Please verify your email address to access all features,
                including publishing blogs, commenting, and subscriptions.
            </p>

            <a
                href="${verifyURL}"
                style="
                    display: inline-block;
                    padding: 10px 18px;
                    background-color: #111827;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-top: 10px;
                    margin-bottom: 10px;
                "
            >
                Verify Email
            </a>

            <p>
                This verification link will expire in 24 hours.
            </p>

            <p>
                If you did not create this account, you can safely ignore this email.
            </p>
        </div>
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

const changeEmailRequest = asyncHandler(async (req, res) => {
    const { newEmail } = req.body;

    if (!newEmail) {
        throw new ApiError(400, "New email is required");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // only unverified users can change email
    if (user.isVerified) {
        throw new ApiError(403, "Verified users cannot change email");
    }

    if (user.email.toLowerCase() === newEmail) {
        throw new ApiError(400, "New email cannot be same as current email");
    }

    // check email already exists
    const isEmailExist = await User.findOne({
        email: newEmail,
    });

    if (isEmailExist) {
        throw new ApiError(400, "This email is already in use");
    }

    user.email = newEmail;

    // mark as unverified again
    user.isVerified = false;
    // save updated user
    await user.save({ validateBeforeSave: false });

    //generate token
    const { rawToken, hashedToken } = generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });
    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;
    //send to mail
    try {
        await sendEmail({
            to: user.email,
            subject: "Verify Your Email Address",
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Email Verification</h2>

            <p>
                Thank you for registering on JournalPress.
                Please verify your email address to access all features,
                including publishing blogs, commenting, and subscriptions.
            </p>

            <a
                href="${verifyURL}"
                style="
                    display: inline-block;
                    padding: 10px 18px;
                    background-color: #111827;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-top: 10px;
                    margin-bottom: 10px;
                "
            >
                Verify Email
            </a>

            <p>
                This verification link will expire in 24 hours.
            </p>

            <p>
                If you did not create this account, you can safely ignore this email.
            </p>
        </div>
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
                "Email changed successfully. A verification email has been sent to your new email address."
            )
        );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user fetched successfully"));
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
    changeEmailRequest,
    getCurrentUser,
};
