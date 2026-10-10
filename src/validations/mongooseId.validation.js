//TODO add  validation for other mongoose objectIds
import Joi from "joi";
import mongoose from "mongoose";

const objectId = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message("Invalid ObjectId");
    }

    return value;
};

export const objectIdSchema = Joi.object({
    id: Joi.string().custom(objectId),
});

// export const commentParamSchema = Joi.object({
//     postId: Joi.string().custom(objectId),
//     commentId: Joi.string().custom(objectId),
// });