import mongoose, { Schema, model } from "mongoose";
import slugify from "slugify";

const blogSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 200,
        },

        slug: {
            type: String,
            lowercase: true,
            trim: true,
            maxlength: 100,
        },

        content: {
            type: String,
            required: true,
            minlength: 10,
        },

        excerpt: {
            type: String,
            trim: true,
            maxlength: 300,
            default: "",
        },

        coverImage: {
            url: {
                type: String,
                default: "",
            },

            public_id: {
                type: String,
                default: "",
            },
        },

        category: {
            type: String,
            enum: [
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
            ],
            required: true,
            lowercase: true,
            trim: true,
            default: "general",
        },

        tags: {
            type: [
                {
                    type: String,
                    lowercase: true,
                    trim: true,
                    maxlength: 30,
                },
            ],

            validate: {
                validator: function (tags) {
                    return tags.length <= 5;
                },
                message: "Maximum 5 tags allowed",
            },

            default: [],
        },

        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },

        publishedAt: {
            type: Date,
        },

        readingTime: {
            //optional
            type: Number,
            default: 1,
        },

        views: {
            type: Number,
            default: 0,
            min: 0,
        },

        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

/* ---------------- INDEXES ---------------- */

// unique blog url
blogSchema.index({ slug: 1 }, { unique: true });

// author's blogs
blogSchema.index({ author: 1, status: 1 });

// category filtering
blogSchema.index({ category: 1 });

// latest blogs
blogSchema.index({ createdAt: -1 });

// search
blogSchema.index({
    title: "text",
    content: "text",
});

/* ---------------- MIDDLEWARE ---------------- */

blogSchema.pre("save", async function () {
    // generate unique slug
    if (this.isModified("title")) {
        const baseSlug = slugify(this.title, {
            lower: true,
            strict: true,
            trim: true,
        }).slice(0, 60);

        let slug = baseSlug;
        let counter = 1;

        while (
            await mongoose.models.Blog.exists({
                slug,
                _id: { $ne: this._id }, //for update blog when title is not changed then slug will also be same so we have to exclude current blog id
            })
        ) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        this.slug = slug;
    }

    // calculate reading time
    if (this.isModified("content")) {
        const words = this.content?.trim()?.split(/\s+/)?.length || 0;

        this.readingTime = Math.max(1, Math.ceil(words / 200));
    }

    // set publish date
    if (
        this.isModified("status") &&
        this.status === "published" &&
        !this.publishedAt
    ) {
        this.publishedAt = new Date(); //update date when blog is published or draft to published
    }
});

/* ---------------- MODEL ---------------- */

const Blog = model("Blog", blogSchema);

export default Blog;
