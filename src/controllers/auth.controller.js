import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as authService from "../services/auth.services.js";

/*
|--------------------------------------------------------------------------
| Cookie Options
|--------------------------------------------------------------------------
*/

// const cookieOptions = {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
// };
const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
};

/*
|--------------------------------------------------------------------------
| Register User
|--------------------------------------------------------------------------
*/

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, fullName, bio } = req.body;

    const { user, accessToken, refreshToken } = await authService.registerUser({
        username,
        email,
        password,
        fullName,
        bio,
    });

    return res
        .status(201)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                201,
                {
                    user,
                    accessToken,
                },
                "User registered successfully"
            )
        );
});

/*
|--------------------------------------------------------------------------
| Login User
|--------------------------------------------------------------------------
*/

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.loginUser({
        username,
        email,
        password,
    });

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user,
                    accessToken,
                },
                "User logged in successfully"
            )
        );
});

/*
|--------------------------------------------------------------------------
| Logout User
|--------------------------------------------------------------------------
*/

const logoutUser = asyncHandler(async (req, res) => {
    await authService.logoutUser(req.user._id);

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, null, "User logged out successfully"));
});

/*
|--------------------------------------------------------------------------
| Refresh Access Token
|--------------------------------------------------------------------------
*/

const refreshAccessToken = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { accessToken, refreshToken } =
        await authService.refreshAccessToken(userId);

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                },
                "Access token refreshed successfully"
            )
        );
});

/*
|--------------------------------------------------------------------------
| Update Password
|--------------------------------------------------------------------------
*/

const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, updatedPassword } = req.body;

    await authService.updatePassword({
        userId: req.user._id,
        currentPassword,
        updatedPassword,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password changed successfully"));
});

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
*/

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    await authService.forgotPassword(email);

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

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    await authService.resetPassword({
        token,
        newPassword,
    });

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, null, "Password reset successfully"));
});

/*
|--------------------------------------------------------------------------
| Request Email Verification
|--------------------------------------------------------------------------
*/

const requestEmailVerification = asyncHandler(async (req, res) => {
    await authService.requestEmailVerification(req.user._id);

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

/*
|--------------------------------------------------------------------------
| Verify Email
|--------------------------------------------------------------------------
*/

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    await authService.verifyEmail(token);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Email verified successfully"));
});

/*
|--------------------------------------------------------------------------
| Get Current User
|--------------------------------------------------------------------------
*/

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user fetched successfully"));
});

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

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
