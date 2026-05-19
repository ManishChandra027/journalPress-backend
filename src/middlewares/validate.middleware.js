import ApiError from "../utils/ApiError.js";

const validate = (schema, property = "body") => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            convert: true,
        });

        if (error) {
            const errors = error.details.map((err) => err.message);

            throw new ApiError(400, errors.join(", "));
        }

        // create validated container only once
        req.validated ??= {};

        // query & params -> store separately
        if (property === "query" || property === "params") {
            req.validated[property] = value;
        } else {
            // body can safely overwrite
            req.body = value;
        }

        next();
    };
};

export default validate;