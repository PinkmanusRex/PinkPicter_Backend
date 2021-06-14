import { RequestHandler } from "express";
import cloudinaryV2 from "../utils/cloudinary/cloudinary-util";
import { NotFoundErr } from "../utils/error_handling/NotFoundErr";
import { ServErr } from "../utils/error_handling/ServErr";
import { IPostInfo, IProfile, IResponse, IUser, RES_TYPE } from "../utils/interfaces/response-interface";
import mysql_pool, { query_helper } from "../utils/mysql/mysql-util";

export const getUserInfoHandler : RequestHandler = async (req, res, next) => {
    const user_name = req.params.user_name;
    console.log(`Retrieving profile info for: ${user_name}`);
    try {
        const connection = await mysql_pool.getConnection();
        let profile_pic_id: string | null = null;
        let banner_id: string | null = null;
        let summary: string | null = null;
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT profile_pic_id, banner_public_id, summary FROM users WHERE username = ?", [user_name]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    console.log(error.code);
                    continue;
                } else {
                    console.log(error.code);
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                if (result.length === 0) {
                    return next(new NotFoundErr("The user was not found"));
                } else {
                    profile_pic_id = result[0].profile_pic_id;
                    banner_id = result[0].banner_public_id;
                    summary = result[0].summary;
                    break;
                }
            }
        }
        await connection.release();
        const profile_pic_url = (profile_pic_id) ? await cloudinaryV2.url(profile_pic_id) : null;
        const banner_pic_url = (banner_id) ? await cloudinaryV2.url(banner_id) : null;
        summary = (summary) ? summary : '';
        const response : IResponse<IProfile> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: {
                user_name: user_name,
                banner_pic: banner_pic_url,
                profile_pic: profile_pic_url,
                summary: summary,
            }
        }
        return res
                .status(200)
                .json(response);
    } catch (e) {
        return next(new ServErr("Could not get a database connection"));
    }
}

export const getUserFavoritesHandler : RequestHandler = async (req, res, next) => {
    const user_name = req.params.user_name;
    const page_no = (req.query.page_no) ? parseInt(req.query.page_no as string) : 1;
    const limit = (req.query.limit) ? parseInt(req.query.limit as string) : 20;
    const offset = (page_no - 1) * limit;
    console.log(`Retrieving user ${user_name}'s favorites page=${page_no}`);
    try {
        const connection = await mysql_pool.getConnection();
        let query_arr : any = [];
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT post_public_id, width, height, title, artist_name, profile_pic_id FROM posts, users WHERE username = artist_name AND post_public_id IN (SELECT post_public_id FROM favorites WHERE username = ?) ORDER BY post_id DESC LIMIT ? OFFSET ?", [user_name, limit, offset]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    console.log(error.code);
                    continue;
                } else {
                    console.log(error.code);
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                query_arr = result;
                break;
            }
        }
        await connection.release();
        const result_arr = query_arr.map((item : any) => {
            const post_pic_url : string = cloudinaryV2.url(item.post_public_id);
            const post_id : string = item.post_public_id;
            const user : IUser = {
                user_name: item.artist_name,
                profile_pic: (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id) : null,
            }
            const width : number = item.width;
            const height : number = item.height;
            const post : IPostInfo= {
                post_pic_url,
                post_id,
                user,
                width,
                height,
            }
            return post;
        })
        const response : IResponse<IPostInfo[]> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: result_arr,
        }
        return res
                .status(200)
                .json(response);
    } catch (e) {
        return next(new ServErr("Could not get a database connection"));
    }
}

export const getUserPostsHandler : RequestHandler = async (req, res, next) => {
    const user_name = req.params.user_name;
    const page_no = (req.query.page_no) ? parseInt(req.query.page_no as string) : 1;
    const limit = (req.query.limit) ? parseInt(req.query.limit as string) : 20;
    const offset = (page_no - 1) * limit;
    try {
        const connection = await mysql_pool.getConnection();
        let query_arr: any = [];
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT post_public_id, width, height, title, artist_name, profile_pic_id FROM posts, users WHERE username = artist_name AND username = ? ORDER BY post_id DESC LIMIT ? OFFSET ?", [user_name, limit, offset]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    console.log(error.code);
                    continue;
                } else {
                    console.log(error.code);
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                query_arr = result;
                break;
            }
        }
        await connection.release();
        const result_arr = query_arr.map((item : any) => {
            const post_pic_url : string = cloudinaryV2.url(item.post_public_id);
            const post_id : string = item.post_public_id;
            const user : IUser = {
                user_name: item.artist_name,
                profile_pic: (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id) : null,
            }
            const width : number = item.width;
            const height : number = item.height;
            const post : IPostInfo = {
                post_pic_url,
                post_id,
                user,
                width,
                height,
            }
            return post;
        })
        const response : IResponse<IPostInfo[]> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: result_arr,
        }
        return res
                .status(200)
                .json(response);
    } catch (e) {
        return next(new ServErr("Could not get a database connection"));
    }
}