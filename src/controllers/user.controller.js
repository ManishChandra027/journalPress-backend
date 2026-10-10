import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

import * as userService from "../services/user.service.js";


// ================= GET CURRENT USER =================

const getCurrentUser = asyncHandler(async (req, res) => {
    const userProfileInfo =
        await userService.getCurrentUser({
            userId: req.user._id,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            userProfileInfo,
            "Current user fetched successfully"
        )
    );
});

// ================= UPDATE ACCOUNT DETAILS =================

const updateAccountDetails = asyncHandler(
    async (req, res) => {
        const updatedUser =
            await userService.updateAccountDetails({
                userId: req.user._id,
                body: req.body,
                file: req.file,
            });

        return res.status(200).json(
            new ApiResponse(
                200,
                updatedUser,
                "Account details updated successfully."
            )
        );
    }
);


// ================= GET PUBLIC PROFILE =================

const getUserPublicProfile = asyncHandler(
    async (req, res) => {
        const { username } =
            req.validated.params;

        const userProfileInfo =
            await userService.getUserPublicProfile({
                username,
            });

        return res.status(200).json(
            new ApiResponse(
                200,
                userProfileInfo,
                "User public profile fetched"
            )
        );
    }
);


// ================= GET USER PUBLISHED POSTS =================

const getUserPublishedPosts = asyncHandler(
    async (req, res) => {
        const { username } =
            req.validated.params;

        const {
            page,
            limit,
            sort,
            category,
            search,
        } = req.validated.query;

        const result =
            await userService.getUserPublishedPosts({
                username,
                page,
                limit,
                sort,
                category,
                search,
            });

        return res.status(200).json(
            new ApiResponse(
                200,
                result,
                "Published posts fetched successfully"
            )
        );
    }
);


// ================= FOLLOW USER =================

const followUser = asyncHandler(
    async (req, res) => {
        const { username } =
            req.validated.params;

        const newFollow =
            await userService.followUser({
                username,
                currentUser: req.user,
            });

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    follow: newFollow,
                },
                "User followed successfully"
            )
        );
    }
);


// ================= UNFOLLOW USER =================

const unfollowUser = asyncHandler(
    async (req, res) => {
        const { username } =
            req.validated.params;

        await userService.unfollowUser({
            username,
            currentUser: req.user,
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                null,
                "User unfollowed successfully"
            )
        );
    }
);


// ================= GET USER FOLLOWERS =================

const getUserFollowers = asyncHandler(
    async (req, res) => {
        const { username } =
            req.validated.params;

        const {
            page,
            limit,
        } = req.validated.query;

        const result =
            await userService.getUserFollowers({
                username,
                page,
                limit,
                currentUser: req.user,
            });

        return res.status(200).json(
            new ApiResponse(
                200,
                result,
                "Followers fetched successfully"
            )
        );
    }
);


// ================= GET USER FOLLOWING =================

const getUserFollowing = asyncHandler(
    async (req, res) => {
        const { username } =
            req.validated.params;

        const {
            page,
            limit,
        } = req.validated.query;

        const result =
            await userService.getUserFollowing({
                username,
                page,
                limit,
                currentUser: req.user,
            });

        return res.status(200).json(
            new ApiResponse(
                200,
                result,
                "Followings fetched successfully"
            )
        );
    }
);


export {
    getCurrentUser,
    updateAccountDetails,
    getUserPublishedPosts,
    getUserPublicProfile,
    followUser,
    unfollowUser,
    getUserFollowers,
    getUserFollowing,
};