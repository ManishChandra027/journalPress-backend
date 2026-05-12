import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

const requireVerifiedUser = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    if (!req.user.isVerified) {
        throw new ApiError(
            403,
            "Please verify your email to access this resource"
        );
    }

    next();
});

export { requireVerifiedUser };
