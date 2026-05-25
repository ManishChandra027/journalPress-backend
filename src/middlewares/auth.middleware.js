import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

const verifyJwt = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "").trim() ||
        null;
    // or req.header("Authorization")?.startsWith("Bearer ")
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
    if (!user) throw new ApiError(401, "User not found");

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

export { verifyJwt, optionalVerifyJwt };
