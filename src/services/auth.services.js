import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import crypto from "crypto";
import generateTemporaryToken from "../utils/generateTemporaryToken.js";
import sendEmail from "../utils/sendEmail.js";

/*
|--------------------------------------------------------------------------
| Generate Access + Refresh Tokens
|--------------------------------------------------------------------------
*/

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId).select("+refreshToken");

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return {
            accessToken,
            refreshToken,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            500,
            "Something went wrong while generating authentication tokens"
        );
    }
};

/*
|--------------------------------------------------------------------------
| Register User
|--------------------------------------------------------------------------
*/

const registerUser = async ({ username, email, password, fullName, bio }) => {
    const isUserExist = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (isUserExist) {
        throw new ApiError(
            409,
            "A user with this email or username already exists."
        );
    }

    const userData = {
        fullName,
        username,
        email,
        password,
    };

    if (bio) {
        userData.bio = bio;
    }

    const user = await User.create(userData);

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const registeredUser = await User.findById(user._id);

    if (!registeredUser) {
        throw new ApiError(500, "Registration failed. Please try again.");
    }

    await requestEmailVerification(user._id);

    return {
        user: registeredUser,
        accessToken,
        refreshToken,
    };
};

/*
|--------------------------------------------------------------------------
| Login User
|--------------------------------------------------------------------------
*/

const loginUser = async ({ username, email, password }) => {
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required.");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    }).select("+password +refreshToken");

    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await user.isPasswordValid(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id);

    if (!loggedInUser) {
        throw new ApiError(500, "Unable to log in. Please try again.");
    }

    return {
        user: loggedInUser,
        accessToken,
        refreshToken,
    };
};

/*
|--------------------------------------------------------------------------
| Logout User
|--------------------------------------------------------------------------
*/

const logoutUser = async (userId) => {
    await User.findByIdAndUpdate(userId, {
        $unset: {
            refreshToken: 1,
        },
    });
};

/*
|--------------------------------------------------------------------------
| Refresh Access Token
|--------------------------------------------------------------------------
*/

const refreshAccessToken = async (userId) => {
    if (!userId) {
        throw new ApiError(400, "User ID is required to refresh access token");
    }
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(userId);

    return {
        accessToken,
        refreshToken,
    };
};

/*
|--------------------------------------------------------------------------
| Update Password
|--------------------------------------------------------------------------
*/

const updatePassword = async ({ userId, currentPassword, updatedPassword }) => {
    if (currentPassword === updatedPassword) {
        throw new ApiError(
            401,
            "Current password and new password should not be same"
        );
    }

    const user = await User.findById(userId).select("+password +refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isCurrentPasswordValid = await user.isPasswordValid(currentPassword);

    if (!isCurrentPasswordValid) {
        throw new ApiError(401, "Current password is incorrect");
    }

    user.password = updatedPassword;

    await user.save({
        validateBeforeSave: false,
    });
};

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
*/

const forgotPassword = async (email) => {
    if (!email) {
        throw new ApiError(400, "Email address is required.");
    }

    const user = await User.findOne({ email });

    /*
     * Security:
     * Do not reveal whether the email exists.
     */
    if (!user) {
        return;
    }

    const { rawToken, hashedToken } = generateTemporaryToken();

    user.passwordResetToken = hashedToken;

    user.passwordResetExpires = Date.now() + 30 * 60 * 1000;

    await user.save({
        validateBeforeSave: false,
    });

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    try {
        await sendEmail({
            to: user.email,
            subject: "Reset your Password",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                ">
                    <h2>Reset Your Password</h2>

                    <p>
                        We received a request to reset your
                        JournalPress password.
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
                        This password reset link will expire
                        in 30 minutes.
                    </p>

                    <p>
                        If you did not request a password reset,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (emailError) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save({
            validateBeforeSave: false,
        });

        console.error(emailError);

        throw new ApiError(
            500,
            "Unable to send the email at the moment. Please try again later."
        );
    }
};

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/

const resetPassword = async ({ token, newPassword }) => {
    if (!token || !newPassword) {
        throw new ApiError(400, "Token and new password are required.");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {
            $gt: Date.now(),
        },
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired password reset token");
    }

    user.password = newPassword;

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    /*
     * Invalidate existing sessions after password reset.
     */
    user.refreshToken = undefined;

    await user.save();
};

/*
|--------------------------------------------------------------------------
| Request Email Verification
|--------------------------------------------------------------------------
*/

const requestEmailVerification = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    if (user.isVerified) {
        throw new ApiError(400, "Email is already verified");
    }

    const { rawToken, hashedToken } = generateTemporaryToken();

    user.emailVerificationToken = hashedToken;

    user.emailVerificationExpires = Date.now() + 30 * 60 * 1000;

    await user.save({
        validateBeforeSave: false,
    });

    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;

    try {
        await sendEmail({
            to: user.email,
            subject: "Verify Your Email Address",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                ">
                    <h2>Email Verification</h2>

                    <p>
                        Thank you for registering on JournalPress.
                        Please verify your email address to access
                        all features.
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
                        This verification link will expire
                        in 30 minutes.
                    </p>

                    <p>
                        If you did not create this account,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (emailError) {
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save({
            validateBeforeSave: false,
        });

        console.error(emailError);

        throw new ApiError(
            500,
            "Unable to send the email at the moment. Please try again later."
        );
    }
};

/*
|--------------------------------------------------------------------------
| Verify Email
|--------------------------------------------------------------------------
*/

const verifyEmail = async (token) => {
    if (!token) {
        throw new ApiError(400, "Verification token is required.");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
            $gt: Date.now(),
        },
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired email verification token");
    }

    user.isVerified = true;

    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();
};

/*
|--------------------------------------------------------------------------
| Get Current User
|--------------------------------------------------------------------------
*/

const getCurrentUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    return user;
};

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
    getCurrentUser,
};
