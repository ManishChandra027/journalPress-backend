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
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedToken) throw new ApiError(401, "Invalid access token");
    const user = await User.findById(decodedToken._id);
    if (!user) throw new ApiError(401, "Invalid access token");
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
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // find user
    const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
    );

    // if user deleted but token still exists
    if (!user) {
        return next();
    }

    // attach user to request
    req.user = user;

    next();
});

export { verifyJwt,optionalVerifyJwt };
