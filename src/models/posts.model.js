import mongoose, { Schema, model } from "mongoose";
import slugify from "slugify";

const postSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
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
                default:
                    "https://www.shutterstock.com/image-photo/post-information-website-concept-workplace-260nw-1189626925.jpg",
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

// unique post url
postSchema.index({ slug: 1 }, { unique: true });

// author's posts
postSchema.index({ author: 1, status: 1 });

// category filtering
postSchema.index({ category: 1 });

// latest posts
postSchema.index({ createdAt: -1 });

// search
postSchema.index({
    title: "text",
    excerpt: "text",
});

/* ---------------- MIDDLEWARE ---------------- */

postSchema.pre("save", async function () {
    // generate unique slug
    if (this.isModified("title")) {
        const baseSlug = slugify(this.title, {
            lower: true,
            strict: true,
            trim: true,
        })
            .slice(0, 60)
            .replace(/-+$/, "");

        let slug = baseSlug;
        let counter = 1;

        while (
            await mongoose.models.Post.exists({
                slug,
                _id: { $ne: this._id }, //for update post when title is not changed then slug will also be same so we have to exclude current post id
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
        this.publishedAt = new Date(); //update date when post is published or draft to published
    }
});

/* ---------------- MODEL ---------------- */

const Post = model("Post", postSchema);

export default Post;
