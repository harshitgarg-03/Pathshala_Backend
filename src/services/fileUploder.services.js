import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

export const uploadOnCloud = async (filePath) => {
    try {
        if(!filePath) return null;

        const res = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto"
        });

        return res;
    } catch (error) {
        fs.unlinkSync(filePath);
        console.log("CLOUD: ", error);
        
        console.error(error);
    }
};