import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

export const uploadOnCloud = async (filePath) => {
    console.log("FILE:: ", filePath);
    
  try {
    if (!filePath) return null;

    const res = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto"
    });
    return res;
  } catch (error) {
    console.error("ERRO in Upload file::", error);
  } finally {
    // 🔥 ALWAYS DELETE
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.log("Cleanup error:", err);
    }
  }
};