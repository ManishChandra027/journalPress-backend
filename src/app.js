import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);
app.use(express.json({ limit: "16kb" })); //to conver json to js object in body
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/api/v1/testing", (req, res) => {
    res.json({
        success: true,
        message: "API working fine",
        data: {
            id: 1,
            name: "Manish",
            role: "Frontend Developer",
            skills: ["React", "Node.js", "MongoDB"],
            isLoggedIn: true,
        },
    });
});

// http://localhost:8000/api/v1/auth/
app.use("/api/v1/auth", authRoutes);
// http://localhost:8000/api/v1/users/
app.use("/api/v1/users", userRoutes);
// http://localhost:8000/api/v1/blogs/
app.use("/api/v1/blogs", blogRoutes);

app.use(errorHandler);

export default app;
