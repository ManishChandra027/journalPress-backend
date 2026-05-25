const errorHandler = (err, req, res, next) => {
   res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
   });
};

export default errorHandler;

//TODO : Add more error handling logic, such as logging errors to a file or external service, and handling specific types of errors (e.g., validation errors, authentication errors).