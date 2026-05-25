class ApiError extends Error {
    constructor(statusCode, message, issues = []) {
        super(message);
        // this.message = message;//already done by super constructor
        this.statusCode = statusCode;
        this.success = false;
        this.issues = issues;
        this.name = "ApiError";

        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;
