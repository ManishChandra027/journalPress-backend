import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

const verifyJwt = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "").trim() ||
        null;
  
    if (!token) throw new ApiError(401, "Access token is required");

    let decodedToken;

    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Invalid or expired access token");
    }

    if (!decodedToken?._id) {
        throw new ApiError(401, "Invalid access token payload");
    }

    const user = await User.findById(decodedToken._id);

    req.user = user;

    next();
});

const optionalVerifyJwt = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "").trim();

    // no token → continue as guest
    if (!token) {
        return next();
    }

    // verify token
    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (!decodedToken?._id) {
            return next();
        }

        const user = await User.findById(decodedToken._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            return next();
        }

        req.user = user;
    } catch (error) {
        // ignore invalid token
        console.log(error.message);
    }

    next();
});

const verifyRefreshToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
        throw new ApiError(401, "Refresh token is required");
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    if (!decodedToken?._id) {
        throw new ApiError(401, "Invalid access token payload");
    }
    const user = await User.findById(decodedToken._id).select("refreshToken");
    if (!user) {
        throw new ApiError(401, "Invalid refresh token.");
    }

    if (user.refreshToken !== token) {
        throw new ApiError(401, "Refresh token is expired or already used.");
    }

    req.user = user;

    next();
});

export { verifyJwt, optionalVerifyJwt, verifyRefreshToken };
