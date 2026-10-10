import Post from "../models/posts.model.js";
import Bookmark from "../models/bookmark.model.js";
import Like from "../models/like.model.js";
import { User } from "../models/user.model.js";

import ApiError from "../utils/ApiError.js";
import deleteFromCloudinary, {
    uploadOnCloudinary,
} from "../utils/cloudinary.js";


// ================= CREATE POST =================

const createPost = async ({ body, user, file }) => {
    let { title, content, excerpt, category, status } = body;

    const stripHtml = (html) => {
        return html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    };

    // Generate excerpt if not provided
    if (!excerpt) {
        excerpt = stripHtml(content).slice(0, 150);
    }

    let imageData = null;

    // Upload cover image
    if (file) {
        const coverImageLocalPath = file.path;

        imageData = await uploadOnCloudinary(coverImageLocalPath);

        if (!imageData?.url || !imageData?.public_id) {
            throw new ApiError(
                400,
                "error during uploade on Cloudinary"
            );
        }
    }

    // TODO:
    // If Cloudinary upload succeeds but DB creation fails,
    // delete uploaded image from Cloudinary.

    const postData = {
        title,
        content,
        excerpt,
        category,
        author: user._id,
        status,
    };

    if (imageData) {
        postData.coverImage = {
            url: imageData.url,
            public_id: imageData.public_id,
        };
    }

    const post = await Post.create(postData);

    return post;
};


// ================= GET PUBLISHED POSTS =================

const getPublishedPosts = async ({
    page,
    limit,
    sort,
    category,
    search,
}) => {
    const filter = {
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
            sortOption = { publishedAt: 1 };
            break;

        case "popular":
            sortOption = { views: -1 };
            break;

        case "latest":
        default:
            sortOption = { publishedAt: -1 };
            break;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const posts = await Post.find(filter)
        .select("-__v")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("author", "fullName username avatar");

    const totalPosts = await Post.countDocuments(filter);

    return {
        posts,
        pagination: {
            page,
            limit,
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
        },
    };
};


// ================= GET MY POSTS =================

const getMyPosts = async ({
    page,
    limit,
    sort,
    category,
    search,
    status,
    user,
}) => {
    const filter = {
        isDeleted: false,
        author: user._id,
    };

    const allowedStatus = ["draft", "published"];

    if (status) {
        if (!allowedStatus.includes(status)) {
            throw new ApiError(400, "Invalid status");
        }

        filter.status = status;
    }

    if (category) {
        filter.category = category;
    }

    // Search
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
            sortOption = { publishedAt: 1 };
            break;

        case "popular":
            sortOption = { views: -1 };
            break;

        case "latest":
        default:
            sortOption = { publishedAt: -1 };
            break;
    }

    const skip = (page - 1) * limit;

    const posts = await Post.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("author", "fullName username avatar")
        .select("-__v");

    const totalPosts = await Post.countDocuments(filter);

    return {
        posts,
        pagination: {
            page,
            limit,
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
        },
    };
};


// ================= GET POST BY SLUG =================

const getPostBySlug = async ({ slug, user }) => {
    if (!slug) {
        throw new ApiError(400, "Slug is required");
    }

    const post = await Post.findOne({
        slug,
        isDeleted: false,
    })
        .populate("author", "fullName username avatar")
        .select("-__v");

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const isDraftOwner =
        post.status === "draft" &&
        user &&
        post.author._id.equals(user._id);

    if (post.status !== "published" && !isDraftOwner) {
        throw new ApiError(404, "Post not found");
    }

    // Increase views only for published posts
    if (post.status === "published") {
        await Post.findByIdAndUpdate(
            post._id,
            {
                $inc: {
                    views: 1,
                },
            }
        );
    }

    let isLiked = false;

    if (user) {
        const liked = await Like.exists({
            user: user._id,
            post: post._id,
        });

        isLiked = !!liked;
    }

    const postObj = post.toObject();

    postObj.isLiked = isLiked;

    return postObj;
};


// ================= UPDATE POST STATUS =================

const updatePostStatus = async ({
    id,
    status,
    user,
}) => {
    if (!id) {
        throw new ApiError(400, "post id are required");
    }

    const post = await Post.findById(id);

    if (!post || post.isDeleted) {
        throw new ApiError(404, "Post not found");
    }

    // Authorization
    if (post.author.toString() !== user._id.toString()) {
        throw new ApiError(403, "Unauthorized user");
    }

    if (post.status === status) {
        throw new ApiError(
            400,
            `Post is already ${status}`
        );
    }

    post.status = status;

    // Update publishedAt
    if (status === "published") {
        post.publishedAt = new Date();
    } else {
        post.publishedAt = null;
    }

    await post.save({
        validateBeforeSave: false,
    });

    return post;
};


// ================= SOFT DELETE POST =================

const softDeletePost = async ({ id, user }) => {
    if (!id) {
        throw new ApiError(400, "id is required");
    }

    const post = await Post.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.isDeleted) {
        throw new ApiError(404, "Post is already deleted");
    }

    // Authorization
    if (!post.author.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    post.isDeleted = true;
    post.deletedAt = new Date();

    await post.save({
        validateBeforeSave: false,
    });

    return post;
};


// ================= SOFT DELETE ALL POSTS =================

const softDeleteAllPosts = async ({ user }) => {
    const updatedPostsResult = await Post.updateMany(
        {
            isDeleted: false,
            author: user._id,
        },
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        }
    );

    if (updatedPostsResult.modifiedCount === 0) {
        throw new ApiError(404, "No active posts found");
    }

    return {
        deletedPosts: updatedPostsResult.modifiedCount,
    };
};


// ================= RESTORE POST =================

const restorePost = async ({ id, user }) => {
    if (!id) {
        throw new ApiError(400, "Post id is required");
    }

    const post = await Post.findOne({
        _id: id,
        isDeleted: true,
    });

    if (!post) {
        throw new ApiError(404, "Deleted post not found");
    }

    // Authorization
    if (!post.author.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    post.isDeleted = false;
    post.deletedAt = null;

    await post.save({
        validateBeforeSave: false,
    });

    return post;
};


// ================= RESTORE ALL POSTS =================

const restoreAllPosts = async ({ user }) => {
    const updatedPostsResult = await Post.updateMany(
        {
            isDeleted: true,
            author: user._id,
        },
        {
            $set: {
                isDeleted: false,
                deletedAt: null,
            },
        }
    );

    if (!updatedPostsResult.modifiedCount) {
        throw new ApiError(404, "Deleted post not found");
    }

    return updatedPostsResult.modifiedCount;
};


// ================= UPDATE POST =================

const updatePost = async ({
    id,
    body,
    file,
    user,
}) => {
    let {
        title,
        content,
        excerpt,
        category,
    } = body;

    if (!id) {
        throw new ApiError(400, "Post id is required");
    }

    const oldPost = await Post.findById(id);

    if (!oldPost || oldPost.isDeleted) {
        throw new ApiError(404, "Post not found");
    }

    // Authorization
    if (!oldPost.author.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    // Preserving current behavior
    if (excerpt) {
        excerpt = content.slice(0, 150);
    }

    let imageData = null;

    // Upload new image
    if (file) {
        const coverImageLocalPath = file.path;

        imageData = await uploadOnCloudinary(
            coverImageLocalPath
        );

        if (
            !imageData?.url ||
            !imageData?.public_id
        ) {
            throw new ApiError(
                400,
                "Error uploading image"
            );
        }
    }

    const oldPublicId =
        oldPost?.coverImage?.public_id;

    if (title !== undefined) {
        oldPost.title = title;
    }

    if (content !== undefined) {
        oldPost.content = content;
    }

    if (excerpt !== undefined) {
        oldPost.excerpt = excerpt;
    }

    if (category !== undefined) {
        oldPost.category = category;
    }

    if (imageData) {
        oldPost.coverImage = {
            url: imageData.url,
            public_id: imageData.public_id,
        };
    }

    await oldPost.save({
        validateBeforeSave: false,
    });

    // Delete old image only after DB save
    if (imageData && oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
    }

    return oldPost;
};


// ================= TOGGLE LIKE =================

const toggleLikePost = async ({
    postId,
    user,
}) => {
    if (!postId) {
        throw new ApiError(400, "Post id is required");
    }

    const post = await Post.findOne({
        _id: postId,
        isDeleted: false,
        status: "published",
    });

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const existingLike = await Like.findOne({
        user: user._id,
        post: postId,
    });

    // Unlike
    if (existingLike) {
        await Like.findByIdAndDelete(
            existingLike._id
        );

        post.likesCount = Math.max(
            0,
            post.likesCount - 1
        );

        await post.save({
            validateBeforeSave: false,
        });

        return {
            liked: false,
            data: null,
            message: "Post unliked successfully",
        };
    }

    // Like
    const like = await Like.create({
        user: user._id,
        post: postId,
    });

    if (!like) {
        throw new ApiError(
            400,
            "Failed to like post"
        );
    }

    post.likesCount += 1;

    await post.save({
        validateBeforeSave: false,
    });

    return {
        liked: true,
        data: like,
        message: "Post liked successfully",
    };
};


// ================= TOGGLE BOOKMARK =================

const toggleBookmarkPost = async ({
    postId,
    user,
}) => {
    if (!postId) {
        throw new ApiError(400, "Post id is required");
    }

    const post = await Post.findOne({
        _id: postId,
        isDeleted: false,
        status: "published",
    });

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const existingBookmark =
        await Bookmark.findOne({
            user: user._id,
            post: postId,
        });

    // Remove bookmark
    if (existingBookmark) {
        await Bookmark.findByIdAndDelete(
            existingBookmark._id
        );

        return {
            bookmarked: false,
            data: null,
            message: "Post unBookmark successfully",
        };
    }

    // Create bookmark
    const bookmark = await Bookmark.create({
        user: user._id,
        post: postId,
    });

    if (!bookmark) {
        throw new ApiError(
            400,
            "Failed to bookmark post"
        );
    }

    return {
        bookmarked: true,
        data: bookmark,
        message: "Post bookmark successfully",
    };
};


// ================= FEATURED POST =================

const getFeaturePost = async () => {
    const [post] = await Post.aggregate([
        {
            $match: {
                status: "published",
                isDeleted: false,
            },
        },

        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments",
            },
        },

        {
            $addFields: {
                commentsCount: {
                    $size: "$comments",
                },
            },
        },

        {
            $project: {
                comments: 0,
                __v: 0,
            },
        },

        {
            $addFields: {
                score: {
                    $add: [
                        {
                            $multiply: [
                                "$likesCount",
                                3,
                            ],
                        },
                        {
                            $multiply: [
                                "$commentsCount",
                                5,
                            ],
                        },
                        {
                            $multiply: [
                                "$views",
                                0.05,
                            ],
                        },
                    ],
                },
            },
        },

        {
            $sort: {
                score: -1,
            },
        },

        {
            $limit: 1,
        },

        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "author",
            },
        },

        {
            $unwind: "$author",
        },

        {
            $project: {
                "author.fullName": 1,
                "author.username": 1,
                "author.avatar": 1,

                title: 1,
                content: 1,
                coverImage: 1,
                views: 1,
                likesCount: 1,
                commentsCount: 1,
                score: 1,
                createdAt: 1,
                slug: 1,
                updatedAt: 1,
                publishedAt: 1,
                readingTime: 1,
                excerpt: 1,
            },
        },
    ]);

    if (!post) {
        throw new ApiError(
            404,
            "No post found"
        );
    }

    return post;
};


// ================= CHECK POST LIKED =================

const checkPostLiked = async ({
    userId,
    postId,
}) => {
    const post = await Post.findOne({
        _id: postId,
        isDeleted: false,
        status: "published",
    });

    if (!post) {
        throw new ApiError(
            404,
            "Post not found"
        );
    }

    const existingLike = await Like.findOne({
        user: userId,
        post: postId,
    });

    return {
        isLiked: !!existingLike,
        message: existingLike
            ? "Post is liked"
            : "Post is not liked",
    };
};


export {
    createPost,
    getPublishedPosts,
    getMyPosts,
    getPostBySlug,
    updatePostStatus,
    updatePost,
    softDeletePost,
    softDeleteAllPosts,
    restoreAllPosts,
    restorePost,
    toggleLikePost,
    toggleBookmarkPost,
    getFeaturePost,
    checkPostLiked,
};