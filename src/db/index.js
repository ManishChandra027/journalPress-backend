import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async () => {
    const connectionInstance = await mongoose.connect(
        `${process.env.MONGO_URL}/${DB_NAME}`
    );
    console.log(
        `\nMongoDB connected !! DB Host:${connectionInstance.connection.host}`
    );
    return connectionInstance;
};

export default connectDb;
