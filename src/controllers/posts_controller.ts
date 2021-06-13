import { RequestHandler } from "express";
import cloudinary from "cloudinary";
import mysql_pool, { commit_helper, query_helper, rollback_helper, transaction_helper } from "../utils/mysql/mysql-util";
import cloudinaryV2, { ICloudUploadResponse, uploadPostPic } from "../utils/cloudinary/cloudinary-util";
import { ServErr } from "../utils/error_handling/ServErr";
import { AuthFailErr } from "../utils/error_handling/AuthFailErr";
import { IResponse, RES_TYPE } from "../utils/interfaces/response-interface";

export const uploadPostHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    let public_id: string | null = null;
    console.log(`${user_name} uploading post...`);
    try {
        const connection = await mysql_pool.getConnection();
        const loopController = {
            current: true,
        }
        while (loopController.current) {
            const err = await transaction_helper(connection);
            if (err) {
                await connection.release();
                console.log("Could not begin a transaction");
                return next(new ServErr("Encountered a database error"));
            }
            const [check, check_error] = await query_helper(connection, "SELECT username FROM users WHERE username = ?", [user_name]);
            if (check_error) {
                if (check_error.code.match(/DEADLOCK/g)) {
                    console.log(check_error.code);
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    continue;
                } else {
                    console.log(check_error.code);
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return next(new ServErr("Encountered a database error"));
                }
            } else {
                if (check.length === 0) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    await connection.release();
                    return next(new AuthFailErr("User not found"));
                }
            }
            const post_pic = req.file as Express.Multer.File;
            const [cld_result, cld_error]: [ICloudUploadResponse | null, cloudinary.UploadApiErrorResponse | null] = await uploadPostPic(post_pic, user_name, public_id);
            if (cld_error) {
                console.log(cld_error.message);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                await connection.release();
                return next(new ServErr(cld_error.message));
            } else {
                public_id = (cld_result as ICloudUploadResponse).public_id;
                const width = (cld_result as ICloudUploadResponse).width;
                const height = (cld_result as ICloudUploadResponse).height;
                const [result, error] = await query_helper(connection, "INSERT INTO posts(post_public_id, post_date, width, height, description, title, artist_name) VALUES(?, ?, ?, ?, ?, ?, ?)", [public_id, new Date(), width, height, req.body.description, req.body.title, user_name]);
                if (error) {
                    if (error.code.match(/DEADLOCK/g)) {
                        console.log(error.code);
                        await rollback_helper(connection, next, loopController);
                        if (!loopController.current) return;
                        continue;
                    } else if (error.code.match(/ER_NO_REFERENCED_ROW/g)) {
                        console.log(error.code);
                        await rollback_helper(connection, next, loopController);
                        if (!loopController.current) return;
                        await connection.release();
                        return next(new AuthFailErr("User does not exist"));
                    } else {
                        console.log(error.code);
                        await rollback_helper(connection, next, loopController);
                        if (!loopController.current) return;
                        await connection.release();
                        return next(new ServErr("Encountered a database error"));
                    }
                } else {
                    await commit_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    await connection.release();
                    const response: IResponse<{ post_id: string }> = {
                        type: RES_TYPE.POST_SUCCESS,
                        payload: {
                            post_id: public_id,
                        }
                    }
                    return res
                        .status(200)
                        .json(response);
                }
            }
        }
    } catch (e) {
        console.log('Could not get a database connection');
        return next(new ServErr("Could not get a database connection"));
    }
}