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
    // console.log(req.body)
    let { title, content, excerpt, category, tags, status } = req.body;
    const user = req?.user;
    if (!user) throw new ApiError(400, "user not found");

    // normalize
    title = title?.trim();
    content = content?.trim();
    excerpt = excerpt?.trim();
    category = category?.toLowerCase()?.trim();
    status = status?.toLowerCase()?.trim();

    // required validation
    if (!title || !content) {
        throw new ApiError(400, "Title and content are required");
    }

    // title validation
    if (title.length < 10 || title.length > 100) {
        throw new ApiError(400, "Title must be between 10 and 100 characters");
    }

    // content validation
    if (content.length < 10) {
        throw new ApiError(400, "Content is too short");
    }

    // excerpt validation
    if (excerpt && excerpt.length < 5) {
        throw new ApiError(400, "Excerpt is too short");
    }
    //status  validation
    const allowedStatus = ["draft", "published"];
    if (status && !allowedStatus.includes(status)) {
        throw new ApiError(400, "Invalid status");
    }

    // tags validation
    if (tags && !Array.isArray(tags)) {
        throw new ApiError(400, "Tags must be an array");
    }

    if (tags) {
        tags = tags
            .filter((tag) => typeof tag === "string")
            .map((tag) => tag.trim().toLowerCase())
            .filter((tag) => tag.length > 0);
        tags = [...new Set(tags)];
    }
    if (!excerpt) {
        excerpt = content.slice(0, 150);
    }
    //catergry
    const allowedCategory = [
        "technology",
        "lifestyle",
        "travel",
        "food",
        "education",
        "health",
        "business",
        "entertainment",
        "sports",
        "general",
    ];
    if (category && !allowedCategory.includes(category)) {
        throw new ApiError(400, "Invalid category");
    }
    //cover image
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
    let { page = 1, limit = 10, sort = "latest", category, search } = req.query;

    // normalize
    page = Number(page);
    limit = Number(limit);
    category = category?.toLowerCase()?.trim();
    search = search?.trim();
    sort = sort?.toLowerCase().trim();

    // validation
    if (page < 1 || limit < 1) {
        throw new ApiError(400, "Invalid page or limit");
    }

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
// /blogs/me?status=draft&page=1&sort=latest
const getMyBlogs = asyncHandler(async (req, res) => {
    let {
        page = 1,
        limit = 10,
        sort = "latest",
        category,
        search,
        status,
    } = req.query;
    const user = req?.user;
    if (!user) throw new ApiError(404, "user not found");
    // normalize
    page = Number(page);
    limit = Number(limit);
    category = category?.toLowerCase()?.trim();
    search = search?.trim();
    sort = sort?.toLowerCase().trim();
    status = status?.toLowerCase().trim();

    // validation
    if (page < 1 || limit < 1) {
        throw new ApiError(400, "Invalid page or limit");
    }

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
    const allowedCategories = [
        "technology",
        "lifestyle",
        "travel",
        "food",
        "education",
        "health",
        "business",
        "entertainment",
        "sports",
        "general",
    ];
    // category filter
    if (category) {
        if (!allowedCategories.includes(category)) {
            throw new ApiError(400, "Invalid status");
        }
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
    const { slug } = req.params;

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

    // normalize
    status = status?.toLowerCase()?.trim();

    // validation
    if (!status || !id) {
        throw new ApiError(400, "Status and blog id are required");
    }

    const allowedStatus = ["draft", "published"];

    if (!allowedStatus.includes(status)) {
        throw new ApiError(400, "Invalid status");
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

    // update status
    blog.status = status;

    // update publishedAt
    if (status === "published") {
        blog.publishedAt = new Date();
    } else {
        blog.publishedAt = null;
    }

    // save
    await blog.save({
        validateBeforeSave: false,
    });

    // response
    res.status(200).json(
        new ApiResponse(200, blog, "Blog status updated successfully")
    );
});

const softDeleteBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    if (!id) throw new ApiError(400, "id is required");
    //get blog
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
const restoreAllBlog = asyncHandler(async (req, res) => {
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

    // get old blog
    const oldBlog = await Blog.findById(id);

    if (!oldBlog || oldBlog.isDeleted) {
        throw new ApiError(404, "Blog not found");
    }

    // authorization
    if (!oldBlog.author.equals(user._id)) {
        throw new ApiError(403, "Unauthorized user");
    }

    // normalize
    title = title?.trim();
    content = content?.trim();
    excerpt = excerpt?.trim();
    category = category?.toLowerCase()?.trim();

    // validation
    if (!title || !content) {
        throw new ApiError(400, "Title and content are required");
    }

    if (title.length < 10 || title.length > 100) {
        throw new ApiError(400, "Title must be between 10 and 100 characters");
    }

    if (content.length < 10) {
        throw new ApiError(400, "Content is too short");
    }

    if (excerpt && excerpt.length < 5) {
        throw new ApiError(400, "Excerpt is too short");
    }

    // category validation
    const allowedCategory = [
        "technology",
        "lifestyle",
        "travel",
        "food",
        "education",
        "health",
        "business",
        "entertainment",
        "sports",
        "general",
    ];

    if (category && !allowedCategory.includes(category)) {
        throw new ApiError(400, "Invalid category");
    }

    // tags validation
    if (tags && !Array.isArray(tags)) {
        throw new ApiError(400, "Tags must be an array");
    }

    if (tags) {
        tags = tags
            .filter((tag) => typeof tag === "string")
            .map((tag) => tag.trim().toLowerCase())
            .filter((tag) => tag.length > 0);

        tags = [...new Set(tags)];
    }

    // auto excerpt
    if (!excerpt) {
        excerpt = content.slice(0, 150);
    }

    // upload new cover image
    const coverFile = req.file;
    let imageData = null;

    if (coverFile) {
        const coverImageLocalPath = coverFile.path;

        imageData = await uploadOnCloudinary(coverImageLocalPath);

        if (!imageData?.url || !imageData?.public_id) {
            throw new ApiError(400, "Error uploading image");
        }
    }

    // store old image id
    const oldPublicId = oldBlog?.coverImage?.public_id;

    // update fields
    oldBlog.title = title;
    oldBlog.content = content;
    oldBlog.excerpt = excerpt;
    oldBlog.category = category;
    oldBlog.tags = tags;

    // update image
    if (imageData) {
        oldBlog.coverImage = {
            url: imageData.url,
            public_id: imageData.public_id,
        };
    }

    // save updated blog
    await oldBlog.save({
        validateBeforeSave: false,
    });

    // delete old image after successful save
    if (imageData && oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
    }

    res.status(200).json(
        new ApiResponse(200, oldBlog, "Blog updated successfully")
    );
});
//-----------------Like-----------------
const toggleLikeBlog = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id: blogId } = req.params;

    // validation
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
    const { id: blogId } = req.params;

    // validation
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
const incrementBlogView = asyncHandler(async (req, res) => {});
export {
    createBlog,
    getPublishedBlogs,
    getMyBlogs,
    getBlogBySlug,
    updateBlogStatus,
    updateBlog,
    softDeleteBlog,
    softDeleteAllBlogs,
    restoreAllBlog,
    restoreBlog,
    toggleLikeBlog,
    toggleBookmarkBlog,
    incrementBlogView,
};
