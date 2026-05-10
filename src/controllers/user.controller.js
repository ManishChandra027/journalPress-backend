import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import jwt from "jsonwebtoken";
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
    await User.findByIdAndUpdate(userId,{
        $unset: { refreshToken: 1 },
    });
    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "User logged out successfully"));
});
export { registerUser, loginUser ,logoutUser };
