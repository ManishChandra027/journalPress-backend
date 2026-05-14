import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import deleteFromCloudinary, {
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getCurrentUser = asyncHandler((req, res) => {
    const user = req.user;
    res.status(200).json(
        new ApiResponse(200, { user }, "Current user fetched successfully")
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
    const normalizedUsername =
    username.toLowerCase().trim();
    const user = await User.findOne({ username:normalizedUsername })
    if (!user) throw new ApiError(404, "User not found");
    res.status(200).json(
        new ApiResponse(200, { user }, "User public profile fetched")
    );
});
// /:username/blogs
const getUserPublishedBlogs = asyncHandler(async (req, res) => {});

export {
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getUserPublishedBlogs,
    getUserPublicProfile,
    getUserBlogs,
    
};
