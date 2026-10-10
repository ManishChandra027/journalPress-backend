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

        if (!fs.existsSync(localFilePath)) {
            throw new Error(
                `Uploaded file not found on disk: ${localFilePath}`
            );
        }

        const result = await cloudinary.uploader.upload(localFilePath, {
            folder: "JournalPress",
            resource_type: "auto",
        });

        return {
            url: result.secure_url,
            public_id: result.public_id,
        };
    } catch (error) {
        const detail =
            error?.error?.message ||
            error?.message ||
            "Unknown Cloudinary upload error";
        console.error("Upload on Cloudinary failed:", detail);
        throw new Error(`Cloudinary upload failed: ${detail}`);
    } finally {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
};

const deleteFromCloudinary = async (public_id) => {
    try {
        if (!public_id) return null;

        const result = await cloudinary.uploader.destroy(public_id);

        return result;
    } catch (error) {
        console.error("Cloudinary delete error:", error);
        return null;
    }
};

export default deleteFromCloudinary;

// TODO
// add file size validation
// mime type validation
// upload timeout handling

export { uploadOnCloudinary, deleteFromCloudinary };
