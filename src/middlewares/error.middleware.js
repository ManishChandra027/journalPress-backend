const formatMessage = (message) => {
    if (typeof message !== "string") {
        return "Something went wrong. Please try again.";
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
        return "Something went wrong. Please try again.";
    }

    if (!/[.!?]$/.test(trimmedMessage)) {
        return `${trimmedMessage}.`;
    }

    return trimmedMessage;
};

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = formatMessage(err.message || "Internal server error.");

    res.status(statusCode).json({
        success: false,
        message,
    });
};

export default errorHandler;

//TODO : Add more error handling logic, such as logging errors to a file or external service, and handling specific types of errors (e.g., validation errors, authentication errors).
