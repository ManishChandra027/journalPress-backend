import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
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
    //save data in db
    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        bio
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

export { registerUser };
