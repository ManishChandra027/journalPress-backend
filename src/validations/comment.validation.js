import Joi from "joi";

export const commentSchema = Joi.object({
    comment: Joi.string().trim().min(1).max(500).messages({
        "string.empty": "Comment cannot be empty",
        "string.min": "Comment must contain at least 1 character",
        "string.max": "Comment cannot exceed 500 characters",
    }),
});
