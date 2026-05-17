import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import blogRoutes from "./routes/blog.routes.js";
const app = express();
//app.set

// app.use

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
    })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// http://localhost:8000/api/v1/auth/
app.use("/api/v1/auth", authRoutes);
// http://localhost:8000/api/v1/users/
app.use("/api/v1/users",userRoutes);
// http://localhost:8000/api/v1/blogs/
app.use("/api/v1/blogs",blogRoutes);
// http://localhost:8000/api/v1/blogs/comment


export default app;
