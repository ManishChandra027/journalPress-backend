import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error("Local file path is required");
        }

        const result = await cloudinary.uploader.upload(localFilePath, {
            folder: "JournalPress",
            resource_type: "auto",
        });

        console.log("File uploaded on Cloudinary successfully");

        return {
            url: result.secure_url,
            public_id: result.public_id,
        };
    } catch (error) {
        console.log("Upload on Cloudinary failed:", error.message);

        throw new Error("Cloudinary upload failed");
    } finally {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
};

// Todo
// add file size validation
// mime type validation
// upload timeout handling
// delete old cloudinary images

export { uploadOnCloudinary };
