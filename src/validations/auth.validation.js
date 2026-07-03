import Joi from "joi";

export const registerSchema = Joi.object({
    fullName: Joi.string().trim().min(3).max(50).required(),

    username: Joi.string()
        .trim()
        .lowercase()
        .min(3)
        .max(30)
        .pattern(/^[a-z0-9_]+$/)
        .required(),

    email: Joi.string().trim().lowercase().email().required(),

    password: Joi.string().min(8).max(128).required(),
});
export const loginSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().allow("").optional(),

    username: Joi.string()
        .trim()
        .lowercase()
        .min(3)
        .max(30)
        .pattern(/^[a-z0-9_]+$/).allow("")
        .optional(),

    password: Joi.string().required(),
}).or("username", "email");

export const resetPasswordSchema = Joi.object({
    newPassword: Joi.string().min(8).max(128).required(),
});
export const changePasswordSchema = Joi.object({
    currendPassword: Joi.string().required(),

    updatedPassword: Joi.string().min(8).max(128).required(),
});

export const changeEmailSchema = Joi.object({
    newEmail: Joi.string().trim().lowercase().email().required(),
});

// export const tokenParamSchema = Joi.object({
//     token: Joi.string()
//         .trim()
//         .required(),
// });
