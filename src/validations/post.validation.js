import Joi from "joi";

const POST_CATEGORIES = [
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

const POST_STATUS = ["draft", "published"];

export const createPostSchema = Joi.object({
    title: Joi.string().trim().min(5).max(100).required(),

    content: Joi.string().trim().min(10).required(),

    excerpt: Joi.string().trim().min(5).max(300).allow("").optional(),

    category: Joi.string()
        .trim()
        .lowercase()
        .valid(...POST_CATEGORIES)
        .optional(),

    status: Joi.string()
        .trim()
        .lowercase()
        .valid(...POST_STATUS)
        .optional(),

    

});

export const updatePostSchema = Joi.object({
    title: Joi.string().trim().min(10).max(100),

    content: Joi.string().trim().min(10),

    excerpt: Joi.string().trim().min(5).max(300),

    category: Joi.string()
        .trim()
        .lowercase()
        .valid(...POST_CATEGORIES),

    status: Joi.string()
        .trim()
        .lowercase()
        .valid(...POST_STATUS),

});

export const postQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),

    limit: Joi.number().integer().min(1).max(50).default(10),

    category: Joi.string()
        .trim()
        .lowercase()
        .valid(...POST_CATEGORIES)
        .optional(),

    search: Joi.string().trim().lowercase().optional(),
    status: Joi.string().trim().lowercase().valid(...POST_STATUS).optional(),

    sort: Joi.string()
        .trim()
        .lowercase()
        .valid("latest", "oldest", "popular")
        .default("latest"),
});
export const slugParamSchema = Joi.object({
    slug: Joi.string()
        .trim()
        .lowercase()
        .min(3)
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .required(),
});

export const statusBodySchema=Joi.object({
    status:Joi.string().lowercase().trim().valid("draft", "published")
})
// updatePostStatusSchema
// mongoIdParamSchema
// slugParamSchema
