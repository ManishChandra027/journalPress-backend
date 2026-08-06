import Joi from "joi";

export const updateAccountSchema = Joi.object({
    username: Joi.string()
        .trim()
        .lowercase()
        .min(3)
        .max(30)
        .pattern(/^[a-z0-9_]+$/)
        .messages({
            "string.pattern.base":
                "Username can only contain lowercase letters, numbers and underscore",
        }),

    fullName: Joi.string().trim().min(3).max(50),

    bio: Joi.string().trim().max(300).allow(""),
    email: Joi.string().trim().lowercase().email(),
}).min(1);

export const usernameParamSchema = Joi.object({
    username: Joi.string()
        .trim()
        .lowercase()
        .min(3)
        .max(30)
        .pattern(/^[a-z0-9_]+$/)
        .required(),
});

export const paginationQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),

    limit: Joi.number().integer().min(1).max(50).default(10),
});

//---------custom error msg----------
// password: Joi.string()
//    .min(8)
//    .required()
//    .messages({
//       "string.min": "Password must contain at least 8 characters",
//       "string.empty": "Password is required"
//    })
