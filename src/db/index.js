import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGO_URL}/${DB_NAME}`
        );

        console.log(
            `MongoDB connected !! DB Host: ${connectionInstance.connection.host}`
        );

        return connectionInstance;
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};
export default connectDb;
