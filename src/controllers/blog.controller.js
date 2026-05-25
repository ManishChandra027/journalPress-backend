import Blog from "../models/blogs.model.js";
import Bookmark from "../models/bookmark.model.js";
import Like from "../models/like.model.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import deleteFromCloudinary, {
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const createBlog = asyncHandler(async (req, res) => {
    let { title, content, excerpt, category, tags, status } = req.body;
    const user = req?.user;

    if (tags) {
        tags = [...new Set(tags)];
    }
    if (!excerpt) {
        excerpt = content.slice(0, 150);
    }

    const coverFile = req?.file;
    let imageData = null;

    if (coverFile) {
        const coverImageLocalPath = coverFile?.path;
        imageData = await uploadOnCloudinary(coverImageLocalPath);
        if (!imageData?.url || !imageData?.public_id)
            throw new ApiError(400, "error during uploade on Cloudinary");
    }
    //TODO upload success ->db fail -> delete uploaded image

    const blogData = {
        title,
        content,
        excerpt,
        category,
        tags,
        author: user._id,
        status,
    };
    if (imageData) {
        blogData.coverImage = {
            url: imageData.url,
            public_id: imageData.public_id,
        };
    }
    const blog = await Blog.create(blogData);
    res.status(201).json(
        new ApiResponse(201, blog, "Blog Created Successfully")
    );
});

const getPublishedBlogs = asyncHandler(async (req, res) => {
    let { page, limit, sort, category, search } = req.validated.query;
    // base filter
    const filter = {
        status: "published",
        isDeleted: false,
    };

    // category filter
    if (category) {
        filter.category = category;
    }

    // search filter
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

    // sorting
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

    // pagination
    const skip = (page - 1) * limit;

    // query
    const blogs = await Blog.find(filter)
        .select("-__v")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("author", "fullname username avatar");

    // total count
    const totalBlogs = await Blog.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                blogs,
                pagination: {
                    page,
                    limit,
                    totalBlogs,
                    totalPages: Math.ceil(totalBlogs / limit),
                },
            },
            "Published blogs fetched successfully"
        )
    );
});

// /blogs/me?status=draft&page=1&sort=latest
const getMyBlogs = asyncHandler(async (req, res) => {
    let { page, limit, sort, category, search, status } = req.validated.query;
    const user = req?.user;

    // base filter
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
    } else {
        filter.status = {
            $in: ["draft", "published"],
        };
    }

    if (category) {
        filter.category = category;
    }

    // search filter
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

    // sorting
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

    // pagination
    const skip = (page - 1) * limit;

    // query
    const blogs = await Blog.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("author", "fullname username avatar")
        .select("-__v");

    // total count
    const totalBlogs = await Blog.countDocuments(filter);

    // response
    res.status(200).json(
        new ApiResponse(
            200,
            {
                blogs,
                pagination: {
                    page,
                    limit,
                    totalBlogs,
                    totalPages: Math.ceil(totalBlogs / limit),
                },
            },
            "Published blogs fetched successfully"
        )
    );
});

const getBlogBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.validated.params;

    if (!slug) {
        throw new ApiError(400, "Slug is required");
    }

    const blog = await Blog.findOne({
        slug,
        status: "published",
        isDeleted: false,
    })
        .populate("author", "fullname username avatar")
        .select("-__v");

    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }
    //update views
    await Blog.findByIdAndUpdate(blog._id, {
        $inc: { views: 1 },
    });

    res.status(200).json(
        new ApiResponse(200, blog, "Blog fetched successfully")
    );
});

const updateBlogStatus = asyncHandler(async (req, res) => {
    let { status } = req.body;
    const { id } = req.params;
    const user = req.user;

    if (!id) {
        throw new ApiError(400, "blog id are required");
    }

    // find blog
    const blog = await Blog.findById(id);
    if (!blog || blog.isDeleted) {
        throw new ApiError(404, "Blog not found");
    }

    // authorization
    if (blog.author.toString() !== user._id.toString()) {
        //or if (!blog.author.equals(user._id))
        throw new ApiError(403, "Unauthorized user");
    }

    blog.status = status;

    // update publishedAt
    if (status === "published") {
        blog.publishedAt = new Date();
    } else {
        blog.publishedAt = null;
    }

    await blog.save({
        validateBeforeSave: false,
    });

    res.status(200).json(
        new ApiResponse(200, blog, "Blog status updated successfully")
    );
});

const softDeleteBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    if (!id) throw new ApiError(400, "id is required");

    const blog = await Blog.findOne({
        _id: id,
        isDeleted: false,
    });
    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }

    if (blog.isDeleted) {
        throw new ApiError(404, "Blog is already deleted");
    }
    // authorization
    if (!blog.author.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }
    //update blog
    blog.isDeleted = true;
    blog.deletedAt = new Date();
    await blog.save({ validateBeforeSave: false });
    res.status(200).json(
        new ApiResponse(200, blog, "Blog softDelete  successfully")
    );
});

const softDeleteAllBlogs = asyncHandler(async (req, res) => {
    const user = req.user;

    // soft delete all active blogs
    const updatedBlogsResult = await Blog.updateMany(
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

    if (updatedBlogsResult.modifiedCount === 0) {
        throw new ApiError(404, "No active blogs found");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            {
                deletedBlogs: updatedBlogsResult.modifiedCount,
            },
            "All blogs deleted successfully"
        )
    );
});

const restoreBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    if (!id) {
        throw new ApiError(400, "Blog id is required");
    }

    // get deleted blog
    const blog = await Blog.findOne({
        _id: id,
        isDeleted: true,
    });

    if (!blog) {
        throw new ApiError(404, "Deleted blog not found");
    }

    // authorization
    if (!blog.author.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    // restore blog
    blog.isDeleted = false;
    blog.deletedAt = null;

    await blog.save({
        validateBeforeSave: false,
    });

    res.status(200).json(
        new ApiResponse(200, blog, "Blog restored successfully")
    );
});

const restoreAllBlogs = asyncHandler(async (req, res) => {
    const user = req.user;

    // get deleted blog
    const updatedBlogsResult = await Blog.updateMany(
        { isDeleted: true, author: user._id },
        {
            $set: {
                isDeleted: false,
                deletedAt: null,
            },
        }
    );

    if (!updatedBlogsResult.modifiedCount) {
        throw new ApiError(404, "Deleted blog not found");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            updatedBlogsResult.modifiedCount,
            "Blog restored successfully"
        )
    );
});

const updateBlog = asyncHandler(async (req, res) => {
    let { title, content, excerpt, category, tags } = req.body;

    const { id } = req.params;
    const user = req.user;

    if (!id) {
        throw new ApiError(400, "Blog id is required");
    }

    const oldBlog = await Blog.findById(id);

    if (!oldBlog || oldBlog.isDeleted) {
        throw new ApiError(404, "Blog not found");
    }

    if (!oldBlog.author.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    if (tags) {
        tags = [...new Set(tags)];
    }

    if (excerpt) {
        excerpt = content.slice(0, 150);
    }

    const coverFile = req.file;
    let imageData = null;

    if (coverFile) {
        const coverImageLocalPath = coverFile.path;

        imageData = await uploadOnCloudinary(coverImageLocalPath);

        if (!imageData?.url || !imageData?.public_id) {
            throw new ApiError(400, "Error uploading image");
        }
    }

    const oldPublicId = oldBlog?.coverImage?.public_id;

    oldBlog.title = title;
    oldBlog.content = content;
    oldBlog.excerpt = excerpt;
    oldBlog.category = category;
    oldBlog.tags = tags;

    if (imageData) {
        oldBlog.coverImage = {
            url: imageData.url,
            public_id: imageData.public_id,
        };
    }

    await oldBlog.save({
        validateBeforeSave: false,
    });

    // delete old image only after successful DB save
    if (imageData && oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
    }

    res.status(200).json(
        new ApiResponse(200, oldBlog, "Blog updated successfully")
    );
});

//-----------------Like,Bookmark-----------------
const toggleLikeBlog = asyncHandler(async (req, res) => {
    const user = req.user;
    const { blogId } = req.params;

    if (!blogId) {
        throw new ApiError(400, "Blog id is required");
    }

    // check blog exists
    const blog = await Blog.findOne({
        _id: blogId,
        isDeleted: false,
        status: "published",
    });

    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }

    // check existing like
    const existingBookmark = await Like.findOne({
        user: user._id,
        blog: blogId,
    });

    // unlike
    if (existingBookmark) {
        await Like.findByIdAndDelete(existingBookmark._id);

        blog.likesCount = Math.max(0, blog.likesCount - 1);

        await blog.save({
            validateBeforeSave: false,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, null, "Blog unliked successfully"));
    }

    // create like
    const like = await Like.create({
        user: user._id,
        blog: blogId,
    });

    if (!like) {
        throw new ApiError(400, "Failed to like blog");
    }

    blog.likesCount += 1;

    await blog.save({
        validateBeforeSave: false,
    });

    res.status(200).json(new ApiResponse(200, like, "Blog liked successfully"));
});

const toggleBookmarkBlog = asyncHandler(async (req, res) => {
    const user = req.user;
    const { blogId } = req.params;

    if (!blogId) {
        throw new ApiError(400, "Blog id is required");
    }

    // check blog exists
    const blog = await Blog.findOne({
        _id: blogId,
        isDeleted: false,
        status: "published",
    });

    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }

    // check existing like
    const existingBookmark = await Bookmark.findOne({
        user: user._id,
        blog: blogId,
    });

    // unlike
    if (existingBookmark) {
        await Bookmark.findByIdAndDelete(existingBookmark._id);

        return res
            .status(200)
            .json(new ApiResponse(200, null, "Blog unBookmark successfully"));
    }

    const bookmark = await Bookmark.create({
        user: user._id,
        blog: blogId,
    });

    if (!bookmark) {
        throw new ApiError(400, "Failed to bookmark blog");
    }

    res.status(200).json(
        new ApiResponse(200, bookmark, "Blog bookmark successfully")
    );
});

export {
    createBlog,
    getPublishedBlogs,
    getMyBlogs,
    getBlogBySlug,
    updateBlogStatus,
    updateBlog,
    softDeleteBlog,
    softDeleteAllBlogs,
    restoreAllBlogs,
    restoreBlog,
    toggleLikeBlog,
    toggleBookmarkBlog,
};
