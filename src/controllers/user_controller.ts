import { RequestHandler } from "express";
import cloudinaryV2 from "../utils/cloudinary/cloudinary-util";
import { NotFoundErr } from "../utils/error_handling/NotFoundErr";
import { ServErr } from "../utils/error_handling/ServErr";
import { generic_db_msg, generic_fail_to_get_connection, generic_user_nf_err } from "../utils/generic_error_msg";
import { IPostInfo, IProfile, IResponse, ISearchPayload, IUser, RES_TYPE } from "../utils/interfaces/response-interface";
import mysql_pool, { commit_helper, connection_release_helper, query_helper, rollback_helper, transaction_helper } from "../utils/mysql/mysql-util";

export const getUserInfoHandler : RequestHandler = async (req, res, next) => {
    let viewer_name = res.locals.user_name;
    const user_name = req.params.user_name;
    if (viewer_name === user_name) viewer_name = '';
    console.log(`Retrieving profile info for: ${user_name}`);
    try {
        const connection = await mysql_pool.getConnection();
        let profile_pic_id: string | null = null;
        let banner_id: string | null = null;
        let summary: string | null = null;
        let following: boolean = false;
        let banner_pic_version: number;
        let profile_pic_version: number;
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT profile_pic_id, banner_public_id, profile_pic_version, banner_pic_version, summary, IF(EXISTS(SELECT * FROM following WHERE artist_name = ? AND username = ?), TRUE, FALSE) as does_follow FROM users WHERE username = ?", [user_name, viewer_name, user_name]);
            if (error) {
                console.log(error.code);
                if (error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (result.length === 0) {
                    console.log(generic_user_nf_err);
                    return await connection_release_helper(connection, next, new NotFoundErr(generic_user_nf_err));
                } else {
                    following = !!result[0].does_follow;
                    profile_pic_id = result[0].profile_pic_id;
                    banner_id = result[0].banner_public_id;
                    summary = result[0].summary;
                    banner_pic_version = result[0].banner_pic_version;
                    profile_pic_version = result[0].profile_pic_version;
                    break;
                }
            }
        }
        const profile_pic_url = (profile_pic_id) ? await cloudinaryV2.url(profile_pic_id, {
            version: profile_pic_version,
            secure: true,
        }) : null;
        const banner_pic_url = (banner_id) ? await cloudinaryV2.url(banner_id, {
            version: banner_pic_version,
            secure: true,
        }) : null;
        summary = (summary) ? summary : '';
        const response : IResponse<IProfile> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: {
                user_name: user_name,
                banner_pic: banner_pic_url,
                profile_pic: profile_pic_url,
                summary: summary,
                following: following,
            }
        }
        return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
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
        let count_pages = 0;
        const loopController = {
            current: true,
        }
        while (loopController.current) {
            const err = await transaction_helper(connection);
            if (err) {
                console.log("Could not begin transaction");
                return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
            }
            const [lock, lock_err] = await query_helper(connection, "SELECT * FROM users WHERE username = ? FOR UPDATE", [user_name]);
            if (lock_err) {
                console.log(lock_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (lock_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [count, count_err] = await query_helper(connection, "SELECT COUNT(*) AS count FROM favorites WHERE username = ?", [user_name]);
            if (count_err) {
                console.log(count_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (count_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [result, error] = await query_helper(connection, "SELECT post_public_id, width, height, title, artist_name, profile_pic_id, profile_pic_version FROM posts, users WHERE username = artist_name AND post_public_id IN (SELECT post_public_id FROM favorites WHERE username = ?) ORDER BY post_id DESC LIMIT ? OFFSET ?", [user_name, limit, offset]);
            if (error) {
                console.log(error.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                count_pages = Math.ceil(count[0].count/limit);
                query_arr = result;
                await commit_helper(connection, next, loopController);
                if (!loopController.current) return;
                break;
            }
        }
        const result_arr = query_arr.map((item : any) => {
            const title: string = item.title;
            const src : string = cloudinaryV2.url(item.post_public_id, {
                secure: true,
            });
            const post_id : string = item.post_public_id;
            const user : IUser = {
                user_name: item.artist_name,
                profile_pic: (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id, {
                    version: item.profile_pic_version,
                    secure: true,
                }) : null,
            }
            const width : number = item.width;
            const height : number = item.height;
            const post : IPostInfo= {
                src,
                post_id,
                user,
                width,
                height,
                title,
            }
            return post;
        })
        const response : IResponse<ISearchPayload> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: {
                count_pages: count_pages,
                posts: result_arr,
            },
        }
        return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const getUserPostsHandler : RequestHandler = async (req, res, next) => {
    const user_name = req.params.user_name;
    const page_no = (req.query.page_no) ? parseInt(req.query.page_no as string) : 1;
    const limit = (req.query.limit) ? parseInt(req.query.limit as string) : 20;
    const offset = (page_no - 1) * limit;
    console.log(`Retrieving ${user_name}'s posts page=${page_no}`);
    try {
        const connection = await mysql_pool.getConnection();
        let count_pages = 0;
        let query_arr: any = [];
        const loopController = {
            current: true,
        }
        while (loopController.current) {
            const err = await transaction_helper(connection);
            if (err) {
                console.log("Could not begin a transaction");
                return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
            }
            const [lock, lock_err] = await query_helper(connection, "SELECT * FROM users WHERE username = ? FOR UPDATE", [user_name])
            if (lock_err) {
                console.log(lock_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (lock_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [count, count_err] = await query_helper(connection, "SELECT COUNT(*) AS count FROM posts WHERE artist_name = ?", [user_name]);
            if (count_err) {
                console.log(count_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (count_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            console.log(`${user_name} has ${count[0].count} posts`);
            const [result, error] = await query_helper(connection, "SELECT post_public_id, width, height, title, artist_name, profile_pic_id, profile_pic_version FROM posts, users WHERE username = artist_name AND username = ? ORDER BY post_id DESC LIMIT ? OFFSET ?", [user_name, limit, offset]);
            if (error) {
                console.log(error.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                count_pages = Math.ceil(count[0].count/limit);
                query_arr = result;
                await commit_helper(connection, next, loopController);
                if (!loopController.current) return;
                break;
            }
        }
        const result_arr = query_arr.map((item : any) => {
            const title: string = item.title;
            const src : string = cloudinaryV2.url(item.post_public_id, {
                secure: true,
            });
            const post_id : string = item.post_public_id;
            const user : IUser = {
                user_name: item.artist_name,
                profile_pic: (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id, {
                    version: item.profile_pic_version,
                    secure: true,
                }) : null,
            }
            const width : number = item.width;
            const height : number = item.height;
            const post : IPostInfo = {
                src,
                post_id,
                user,
                width,
                height,
                title,
            }
            return post;
        })
        const response : IResponse<ISearchPayload> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: {
                count_pages: count_pages,
                posts: result_arr,
            }
        }
        return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
    } catch (e) {
        return next(new ServErr(generic_fail_to_get_connection));
    }
}