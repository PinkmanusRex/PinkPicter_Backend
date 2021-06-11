import cloudinary from "cloudinary";
import dotenv from "dotenv";
import path from "path";
dotenv.config({
    path: path.join(__dirname, "../../../.env"),
})

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'put your cloud name';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'put your api key';
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET || 'put your secret';

const cloudinaryV2 = cloudinary.v2;

cloudinaryV2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_SECRET,
})

export default cloudinaryV2;