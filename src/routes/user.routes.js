import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();
// /me

// router.route("current-user").get(verifyJwt, getCurrentUser);
// router.route("update-account").patch(verifyJwt, updateAccountDetails);
// router
//     .route("update-avatar")
//     .patch(verifyJwt, upload.single("avatar"), updateUserAvatar);
//
// router.route("/channel/:username").get(verifyJwt, getUserChannelInfo);
// router.route("watch-history").get(verifyJwt, getWatchHistory);

export default router;