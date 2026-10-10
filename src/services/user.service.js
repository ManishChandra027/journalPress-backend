import Post from "../models/posts.model.js";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";

import ApiError from "../utils/ApiError.js";
import deleteFromCloudinary, {
    uploadOnCloudinary,
} from "../utils/cloudinary.js";


// ================= GET CURRENT USER =================

const getCurrentUser = async ({ userId }) => {
    const [userProfileInfo] = await User.aggregate([
        {
            $match: {
                _id: userId,
            },
        },

        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "following",
                as: "followers",
            },
        },

        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "follower",
                as: "following",
            },
        },

        {
            $addFields: {
                followersCount: {
                    $size: "$followers",
                },
                followingCount: {
                    $size: "$following",
                },
            },
        },

        {
            $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
                bio: 1,
                followersCount: 1,
                followingCount: 1,
                isVerified: 1,
                email: 1,
                role: 1,
            },
        },
    ]);

    return userProfileInfo;
};


// ================= UPDATE ACCOUNT DETAILS =================

const updateAccountDetails = async ({
    userId,
    body,
    file,
}) => {
    const {
        email,
        username,
        fullName,
        bio,
    } = body;

    const avatarFile = file;

    // At least one field must be provided
    if (
        !email &&
        !username &&
        !fullName &&
        bio === undefined &&
        !avatarFile
    ) {
        throw new ApiError(
            400,
            "At least one field is required for update."
        );
    }

    // Get current user
    const dbUser = await User.findById(userId);

    if (!dbUser) {
        throw new ApiError(
            404,
            "User not found."
        );
    }


    // ================= USERNAME =================

    if (username) {
        if (!username) {
            throw new ApiError(
                400,
                "Username cannot be empty."
            );
        }

        if (dbUser.username === username) {
            throw new ApiError(
                400,
                "New username must be different from the current one."
            );
        }

        const existingUser = await User.findOne({
            username,
            _id: {
                $ne: dbUser._id,
            },
        });

        if (existingUser) {
            throw new ApiError(
                409,
                "Username is already taken."
            );
        }

        dbUser.username = username;
    }


    // ================= FULL NAME =================

    if (fullName) {
        if (!fullName) {
            throw new ApiError(
                400,
                "Full name cannot be empty."
            );
        }

        if (dbUser.fullName === fullName) {
            throw new ApiError(
                400,
                "New full name must be different from the current one."
            );
        }

        dbUser.fullName = fullName;
    }


    // ================= EMAIL =================

    if (email) {
        // Only verified users cannot change email
        if (dbUser.isVerified) {
            throw new ApiError(
                400,
                "You cannot change your email address once it has been verified."
            );
        }

        if (!email) {
            throw new ApiError(
                400,
                "Email cannot be empty."
            );
        }

        if (
            dbUser.email.toLowerCase() === email
        ) {
            throw new ApiError(
                400,
                "New email must be different from the current one."
            );
        }

        const existingUser = await User.findOne({
            email,
            _id: {
                $ne: dbUser._id,
            },
        });

        if (existingUser) {
            throw new ApiError(
                409,
                "An account with this email already exists."
            );
        }

        dbUser.email = email;
    }


    // ================= BIO =================

    if (bio !== undefined) {
        dbUser.bio = bio.trim();
    }


    // ================= AVATAR =================

    let oldAvatarPublicId = null;

    if (avatarFile) {
        const avatarLocalPath = avatarFile.path;

        const uploadResult =
            await uploadOnCloudinary(
                avatarLocalPath
            );

        if (
            !uploadResult?.url ||
            !uploadResult?.public_id
        ) {
            throw new ApiError(
                500,
                "Failed to upload avatar image."
            );
        }

        // Save old avatar before replacing
        oldAvatarPublicId =
            dbUser.avatar?.public_id;

        dbUser.avatar = {
            url: uploadResult.url,
            public_id: uploadResult.public_id,
        };
    }


    // ================= SAVE USER =================

    await dbUser.save();


    // ================= DELETE OLD AVATAR =================

    if (
        avatarFile &&
        oldAvatarPublicId
    ) {
        try {
            await deleteFromCloudinary(
                oldAvatarPublicId
            );
        } catch (error) {
            console.error(
                "Failed to delete old avatar from Cloudinary:",
                error
            );
        }
    }


    // ================= SANITIZED USER =================

    const updatedUser =
        await User.findById(
            dbUser._id
        ).select(
            "-password -refreshToken"
        );

    return updatedUser;
};


// ================= GET PUBLIC PROFILE =================

const getUserPublicProfile = async ({
    username,
}) => {
    const [userProfileInfo] =
        await User.aggregate([
            {
                $match: {
                    username,
                },
            },

            {
                $lookup: {
                    from: "follows",
                    localField: "_id",
                    foreignField: "following",
                    as: "followers",
                },
            },

            {
                $lookup: {
                    from: "follows",
                    localField: "_id",
                    foreignField: "follower",
                    as: "following",
                },
            },

            {
                $addFields: {
                    followersCount: {
                        $size: "$followers",
                    },
                    followingCount: {
                        $size: "$following",
                    },
                },
            },

            {
                $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    bio: 1,
                    followersCount: 1,
                    followingCount: 1,
                    isVerified: 1,
                },
            },
        ]);

    return userProfileInfo;
};


// ================= GET USER PUBLISHED POSTS =================

const getUserPublishedPosts = async ({
    username,
    page,
    limit,
    sort,
    category,
    search,
}) => {
    const user = await User.findOne({
        username,
    });

    if (!user) {
        throw new ApiError(
            400,
            "user not found"
        );
    }

    // Base filter
    const filter = {
        author: user._id,
        status: "published",
        isDeleted: false,
    };


    // Category filter
    if (category) {
        filter.category = category;
    }


    // Search filter
    if (search) {
        filter.$or = [
            {
                title: {
                    $regex: search,
                    $options: "i",
                },
            },
            {
                excerpt: {
                    $regex: search,
                    $options: "i",
                },
            },
        ];
    }


    // Sorting
    let sortOption = {};

    switch (sort) {
        case "oldest":
            sortOption = {
                publishedAt: 1,
            };
            break;

        case "popular":
            sortOption = {
                views: -1,
            };
            break;

        case "latest":
        default:
            sortOption = {
                publishedAt: -1,
            };
            break;
    }


    // Pagination
    const skip = (page - 1) * limit;


    // Get posts
    const posts = await Post.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate(
            "author",
            "fullname username avatar"
        )
        .select("-__v");


    // Total posts
    const totalPosts =
        await Post.countDocuments(filter);


    return {
        posts,
        pagination: {
            page,
            limit,
            totalPosts,
            totalPages: Math.ceil(
                totalPosts / limit
            ),
        },
    };
};


// ================= FOLLOW USER =================

const followUser = async ({
    username,
    currentUser,
}) => {
    const userToFollow =
        await User.findOne({
            username,
        });

    if (!userToFollow) {
        throw new ApiError(
            404,
            "User to follow not found"
        );
    }


    // Prevent self follow
    if (
        userToFollow._id.equals(
            currentUser._id
        )
    ) {
        throw new ApiError(
            400,
            "Users cannot follow themselves"
        );
    }


    // Check existing follow
    const existingFollow =
        await Follow.findOne({
            follower: currentUser._id,
            following: userToFollow._id,
        });

    if (existingFollow) {
        throw new ApiError(
            400,
            "You are already following this user"
        );
    }


    // Create follow
    const newFollow =
        await Follow.create({
            follower: currentUser._id,
            following: userToFollow._id,
        });

    return newFollow;
};


// ================= UNFOLLOW USER =================

const unfollowUser = async ({
    username,
    currentUser,
}) => {
    const userToUnfollow =
        await User.findOne({
            username,
        });

    if (!userToUnfollow) {
        throw new ApiError(
            404,
            "User to unfollow not found"
        );
    }


    // Prevent self unfollow
    if (
        userToUnfollow._id.equals(
            currentUser._id
        )
    ) {
        throw new ApiError(
            400,
            "You cannot unfollow yourself"
        );
    }


    const deleteResult =
        await Follow.deleteOne({
            follower: currentUser._id,
            following: userToUnfollow._id,
        });


    if (
        deleteResult.deletedCount === 0
    ) {
        throw new ApiError(
            400,
            "You are not following this user"
        );
    }

    return true;
};


// ================= GET USER FOLLOWERS =================

const getUserFollowers = async ({
    username,
    page,
    limit,
    currentUser,
}) => {
    const skip = (page - 1) * limit;

    const isOwnProfile =
        currentUser?.username === username;


    // Find target user
    const user = await User.findOne({
        username,
    });

    if (!user) {
        throw new ApiError(
            404,
            "User not found"
        );
    }


    // Total followers
    const totalFollowers =
        await Follow.countDocuments({
            following: user._id,
        });


    // Get followers
    const followers =
        await Follow.find({
            following: user._id,
        })
            .populate(
                "follower",
                "username fullName avatar"
            )
            .skip(skip)
            .limit(limit);


    // Extract users
    const followerUsers = followers
        .filter(
            (followDoc) =>
                followDoc.follower
        )
        .map(
            (followDoc) =>
                followDoc.follower
        );


    // IDs of followers on this page
    const followerIds =
        followerUsers.map(
            (follower) =>
                follower._id
        );


    // Check which followers current user follows
    let followedUserIds = [];

    if (currentUser) {
        const existingFollows =
            await Follow.find({
                follower: currentUser._id,
                following: {
                    $in: followerIds,
                },
            }).select("following");

        followedUserIds =
            existingFollows.map(
                (follow) =>
                    follow.following.toString()
            );
    }


    // Format response
    const formattedFollowers =
        followerUsers.map(
            (follower) => ({
                _id: follower._id,
                username: follower.username,
                fullName: follower.fullName,
                avatar: follower.avatar,

                isFollowing:
                    followedUserIds.includes(
                        follower._id.toString()
                    ),
            })
        );


    return {
        isOwnProfile,
        followers: formattedFollowers,

        pagination: {
            page,
            limit,
            totalFollowers,
            totalPages: Math.ceil(
                totalFollowers / limit
            ),
        },
    };
};


// ================= GET USER FOLLOWING =================

const getUserFollowing = async ({
    username,
    page,
    limit,
    currentUser,
}) => {
    const skip = (page - 1) * limit;

    const isOwnProfile =
        currentUser?.username === username;


    // Find target user
    const user = await User.findOne({
        username,
    });

    if (!user) {
        throw new ApiError(
            404,
            "User not found"
        );
    }


    // Total following count
    const totalFollowings =
        await Follow.countDocuments({
            follower: user._id,
        });


    // Get following
    const followings =
        await Follow.find({
            follower: user._id,
        })
            .populate(
                "following",
                "username fullName avatar"
            )
            .skip(skip)
            .limit(limit);


    // Extract target users
    const followingUsers =
        followings
            .filter(
                (followDoc) =>
                    followDoc.following
            )
            .map(
                (followDoc) =>
                    followDoc.following
            );


    // IDs of users shown on this page
    const followingUserIds =
        followingUsers.map(
            (followingUser) =>
                followingUser._id
        );


    // Check which users current user follows
    let followedUserIds = [];

    if (currentUser) {
        const existingFollows =
            await Follow.find({
                follower: currentUser._id,
                following: {
                    $in: followingUserIds,
                },
            }).select("following");

        followedUserIds =
            existingFollows.map(
                (follow) =>
                    follow.following.toString()
            );
    }


    // Format response
    const formattedFollowings =
        followingUsers.map(
            (followingUser) => ({
                _id: followingUser._id,
                username:
                    followingUser.username,
                fullName:
                    followingUser.fullName,
                avatar:
                    followingUser.avatar,

                isFollowing:
                    followedUserIds.includes(
                        followingUser._id.toString()
                    ),
            })
        );


    return {
        isOwnProfile,
        followings:
            formattedFollowings,

        pagination: {
            page,
            limit,
            totalFollowings,
            totalPages: Math.ceil(
                totalFollowings / limit
            ),
        },
    };
};


export {
    getCurrentUser,
    updateAccountDetails,
    getUserPublicProfile,
    getUserPublishedPosts,
    followUser,
    unfollowUser,
    getUserFollowers,
    getUserFollowing,
};