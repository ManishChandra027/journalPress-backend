import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import deleteFromCloudinary, {
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;
    const [userProfileInfo] = await User.aggregate([
        { $match: { _id: user._id } }, //1st pipeline stage to filter user by username
        {
            $lookup: {
                //2nd stage to lookup followers count
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
        }, //3rd stage to lookup following count
        {
            $addFields: {
                followersCount: { $size: "$followers" },
                followingCount: { $size: "$following" },
            },
        }, //4th stage to project only required fields and count of followers and following
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
        }, //5th stage to remove followers and following array from the result
    ]);
    res.status(200).json(
        new ApiResponse(
            200,
            userProfileInfo,
            "Current user fetched successfully"
        )
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { username, fullName, bio } = req.body;
    if (!fullName && !bio && !username) {
        throw new ApiError(
            400,
            "At least one field (username,fullName or bio) is required for update"
        );
    }
    const user = req.user;
    const dbUser = await User.findById(user._id);
    if (username) {
        const normalizedUsername = username.toLowerCase().trim();
        if (dbUser.username === normalizedUsername) {
            throw new ApiError(
                400,
                "New username must be different from the current one"
            );
        }
        const existingUser = await User.findOne({
            username: normalizedUsername,
        });
        if (existingUser) {
            throw new ApiError(400, "Username is already taken");
        }

        dbUser.username = normalizedUsername;
    }
    if (fullName) {
        const normalizedFullName = fullName.trim();
        if (dbUser.fullName === normalizedFullName) {
            throw new ApiError(
                400,
                "New full name must be different from the current one"
            );
        }
        dbUser.fullName = normalizedFullName;
    }
    if (bio !== undefined) {
        dbUser.bio = bio;
    }
    await dbUser.save();
    dbUser.password = undefined;
    dbUser.refreshToken = undefined;
    res.status(200).json(
        new ApiResponse(200, dbUser, "Account details updated")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarFile = req.file;
    if (!avatarFile) {
        throw new ApiError(400, "Avatar image is required");
    }
    const avatarLocalPath = avatarFile.path;
    //fatch db user
    const dbUser = await User.findById(req.user._id);

    // uplode to cloudenary
    const { url, public_id } = await uploadOnCloudinary(avatarLocalPath);
    if (!url || !public_id) {
        throw new ApiError(500, "Failed to upload avatar image");
    }

    //add url to db user
    const oldAvatarPublicId = dbUser.avatar?.public_id;
    dbUser.avatar.url = url;
    dbUser.avatar.public_id = public_id;
    await dbUser.save();

    //take old url after successful updode new avatr and delete it
    if (oldAvatarPublicId) {
        const deleteResult = await deleteFromCloudinary(oldAvatarPublicId);

        console.log("Old avatar deleted from Cloudinary:", deleteResult);
    }

    res.status(200).json(
        new ApiResponse(200, { url }, "Avatar updated successfully")
    );
});

// /me/blogs
const getUserBlogs = asyncHandler(async (req, res) => {});

// /:username
const getUserPublicProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username) throw new ApiError(400, "Username is required");
    const normalizedUsername = username.toLowerCase().trim();
    // const user = await User.findOne({ username: normalizedUsername });
    // if (!user) throw new ApiError(404, "User not found");
    const [userProfileInfo] = await User.aggregate([
        { $match: { username: normalizedUsername } }, //1st pipeline stage to filter user by username
        {
            $lookup: {
                //2nd stage to lookup followers count
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
        }, //3rd stage to lookup following count
        {
            $addFields: {
                followersCount: { $size: "$followers" },
                followingCount: { $size: "$following" },
            },
        }, //4th stage to project only required fields and count of followers and following
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
        }, //5th stage to remove followers and following array from the result
    ]);
    res.status(200).json(
        new ApiResponse(200, userProfileInfo, "User public profile fetched")
    );
});
// /:username/blogs
// TODO: add pagination and filter for published blogs
const getUserPublishedBlogs = asyncHandler(async (req, res) => {});

// /:username/follow
const followUser = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username) throw new ApiError(400, "Username is required");
    const normalizedUsername = username.toLowerCase().trim();
    const userToFollow = await User.findOne({ username: normalizedUsername });
    if (!userToFollow) throw new ApiError(404, "User to follow not found");
    const currentUser = req.user;
    if (userToFollow._id.equals(currentUser._id)) {
        throw new ApiError(400, "Users cannot follow themselves");
    }
    const existingFollow = await Follow.findOne({
        follower: currentUser._id,
        following: userToFollow._id,
    });
    if (existingFollow) {
        throw new ApiError(400, "You are already following this user");
    }

    const newFollow = await Follow.create({
        follower: currentUser._id,
        following: userToFollow._id,
    });
    res.status(201).json(
        new ApiResponse(
            201,
            { follow: newFollow },
            "User followed successfully"
        )
    );
});
//:username/unfollow
const unfollowUser = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, "Username is required");
    }

    const normalizedUsername = username.toLowerCase().trim();

    const userToUnfollow = await User.findOne({
        username: normalizedUsername,
    });

    if (!userToUnfollow) {
        throw new ApiError(404, "User to unfollow not found");
    }

    const currentUser = req.user;

    if (userToUnfollow._id.equals(currentUser._id)) {
        throw new ApiError(400, "You cannot unfollow yourself");
    }

    const deleteResult = await Follow.deleteOne({
        follower: currentUser._id,
        following: userToUnfollow._id,
    });

    if (deleteResult.deletedCount === 0) {
        throw new ApiError(400, "You are not following this user");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "User unfollowed successfully"));
});
const getUserFollowers = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) throw new ApiError(400, "Username is required");
    const normalizedUsername = username.toLowerCase().trim();
    const isOwnProfile = req?.user?.username === normalizedUsername;
    // pagination query params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // target user find
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // total followers count
    const totalFollowers = await Follow.countDocuments({
        following: user._id,
    });

    // followers list
    const followers = await Follow.find({
        following: user._id,
    })
        .populate("follower", "username fullName avatar")
        .skip(skip)
        .limit(limit);

    // actual user data extract
    const formattedFollowers = followers.map((followDoc) => ({
        _id: followDoc.follower._id,
        username: followDoc.follower.username,
        fullName: followDoc.follower.fullName,
        avatar: followDoc.follower.avatar,
    }));

    // TODO: add filter that follower is deleted user

    res.status(200).json(
        new ApiResponse(
            200,
            {
                isOwnProfile,
                followers: formattedFollowers,

                pagination: {
                    page,
                    limit,
                    totalFollowers,
                    totalPages: Math.ceil(totalFollowers / limit),
                },
            },
            "Followers fetched successfully"
        )
    );
});
// const get
const getUserFollowing = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) throw new ApiError(400, "Username is required");
    const normalizedUsername = username.toLowerCase().trim();
    const isOwnProfile = req?.user?.username === normalizedUsername;
    // pagination query params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // target user find
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // total followers count
    const totalFollowings = await Follow.countDocuments({
        follower: user._id,
    });

    // followers list
    const followings = await Follow.find({
        follower: user._id,
    })
        .populate("following", "username fullName avatar")
        .skip(skip)
        .limit(limit);

    // actual user data extract
    const formattedFollowings = followings.map((followDoc) => ({
        _id: followDoc.following._id,
        username: followDoc.following.username,
        fullName: followDoc.following.fullName,
        avatar: followDoc.following.avatar,
    }));

    // TODO: add filter that follower is deleted user

    res.status(200).json(
        new ApiResponse(
            200,
            {
                isOwnProfile,
                followings: formattedFollowings,

                pagination: {
                    page,
                    limit,
                    totalFollowings,
                    totalPages: Math.ceil(totalFollowings / limit),
                },
            },
            "followings fetched successfully"
        )
    );
});
export {
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getUserPublishedBlogs,
    getUserPublicProfile,
    getUserBlogs,
    followUser,
    unfollowUser,
    getUserFollowers,
    getUserFollowing,
};
