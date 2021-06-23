import cloudinary from "cloudinary";
import dotenv from "dotenv";
import path from "path";
import streamifier from "streamifier";

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

export interface ICloudUploadResponse {
    public_id: string,
    width: number,
    height: number,
    url: string,
}

export const deletePostPic = async (post_id: string): Promise<any[]> => {
    try {
        const cloudinary_res = await new Promise((resolve, reject) => {
            cloudinaryV2.uploader.destroy(post_id, undefined, (error, result) => {
                if (error) reject(error);
                resolve(result);
            })
        })
        return [cloudinary_res, null];
    } catch (e) {
        return [null, e];
    }
}

export const uploadProfilePic = async (file: Express.Multer.File, user_name: string): Promise<[ICloudUploadResponse & {version: number} | null, cloudinary.UploadApiErrorResponse | null]> => {
    try {
        const cloudinary_res = await new Promise((resolve, reject) => {
            const cld_upload_stream = cloudinaryV2.uploader.upload_stream({
                public_id: `profile_pic`,
                folder: `${user_name}/profile`,
                overwrite: true,
                invalidate: true,
            }, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            })
            streamifier.createReadStream(file.buffer).pipe(cld_upload_stream);
        })
        const public_id = (cloudinary_res as cloudinary.UploadApiResponse).public_id;
        const width = (cloudinary_res as cloudinary.UploadApiResponse).width;
        const height = (cloudinary_res as cloudinary.UploadApiResponse).height;
        const url = (cloudinary_res as cloudinary.UploadApiResponse).secure_url;
        const version = (cloudinary_res as cloudinary.UploadApiResponse).version;
        return [{ public_id, width, height, url, version }, null];
    } catch (e) {
        const err = (e as cloudinary.UploadApiErrorResponse);
        return [null, err];
    }
}

export const uploadBannerPic = async (file: Express.Multer.File, user_name: string) : Promise<[ICloudUploadResponse & {version: number} | null, cloudinary.UploadApiErrorResponse | null]> => {
    try{
        const cloudinary_res = await new Promise((resolve, reject) => {
            const cld_upload_stream = cloudinaryV2.uploader.upload_stream({
                public_id: 'banner_pic',
                folder: `${user_name}/profile`,
                overwrite: true,
                invalidate: true,
            }, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            })
            streamifier.createReadStream(file.buffer).pipe(cld_upload_stream);
        })
        const public_id = (cloudinary_res as cloudinary.UploadApiResponse).public_id;
        const width = (cloudinary_res as cloudinary.UploadApiResponse).width;
        const height = (cloudinary_res as cloudinary.UploadApiResponse).height;
        const url = (cloudinary_res as cloudinary.UploadApiResponse).secure_url;
        const version = (cloudinary_res as cloudinary.UploadApiResponse).version;
        return [{public_id, width, height, url, version}, null];
    } catch (e) {
        const err = (e as cloudinary.UploadApiErrorResponse);
        return [null, err];
    }
}

export const uploadPostPic = async (file: Express.Multer.File, user_name: string, arg_public_id : string | null) : Promise<[ICloudUploadResponse | null, cloudinary.UploadApiErrorResponse | null]> => {
    try {
        const cloud_options : cloudinary.UploadApiOptions = arg_public_id ? {
            public_id: arg_public_id.match(new RegExp(`^${user_name}/posts/(.+)$`))![1],
            folder: `${user_name}/posts`,
            overwrite: true,
            invalidate: true,
        } : {
            folder: `${user_name}/posts`,
        }
        const cloudinary_res = await new Promise((resolve, reject) => {
            const cld_upload_stream = cloudinaryV2.uploader.upload_stream(cloud_options, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            })
            streamifier.createReadStream(file.buffer).pipe(cld_upload_stream);
        })
        const cloud_response = cloudinary_res as cloudinary.UploadApiResponse;
        const public_id = cloud_response.public_id;
        const width = cloud_response.width;
        const height = cloud_response.height;
        const url = cloud_response.secure_url;
        return [{public_id, width, height, url}, null]
    } catch (e) {
        const err = (e as cloudinary.UploadApiErrorResponse);
        return [null, err];
    }
}

export default cloudinaryV2;