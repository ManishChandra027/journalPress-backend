class ApiResponse {
    constructor(statusCode, data = null, message = "Success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode >= 200 && statusCode < 300;
    }
}

export default ApiResponse;
