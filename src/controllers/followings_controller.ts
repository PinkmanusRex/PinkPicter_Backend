import { RequestHandler } from "express";
import cloudinaryV2 from "../utils/cloudinary/cloudinary-util";
import { AuthFailErr } from "../utils/error_handling/AuthFailErr";
import { InvalidFieldError } from "../utils/error_handling/InvalidFieldError";
import { NotFoundErr } from "../utils/error_handling/NotFoundErr";
import { ServErr } from "../utils/error_handling/ServErr";
import { generic_db_msg, generic_fail_to_get_connection, generic_not_auth_err, generic_user_nf_err } from "../utils/generic_error_msg";
import { FollowList, IResponse, IUser, RES_TYPE } from "../utils/interfaces/response-interface";
import mysql_pool, { commit_helper, connection_release_helper, query_helper, rollback_helper, transaction_helper } from "../utils/mysql/mysql-util";

export const addFollowingHandler: RequestHandler = async (req, res, next) => {
    const viewer_name = res.locals.user_name;
    const user_name = req.body.user_name;
    if (viewer_name === user_name) return next(new InvalidFieldError("Can't follow self"));
    console.log(`${viewer_name} attempting to follow ${user_name}`);
    try {
        const connection = await mysql_pool.getConnection();
        const loopController = {
            current: true,
        }
        while (loopController.current) {
            const err = await transaction_helper(connection);
            if (err) {
                console.log("could not begin a transaction");
                return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
            }
            const [lock, lock_err] = await query_helper(connection, "SELECT * FROM users WHERE username IN (?, ?) FOR UPDATE", [viewer_name, user_name]);
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
            const [check_viewer_user, check_viewer_user_err] = await query_helper(connection, "SELECT * FROM users WHERE username IN (?, ?)", [viewer_name, user_name]);
            if (check_viewer_user_err) {
                console.log(check_viewer_user_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (check_viewer_user_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (check_viewer_user.length < 2) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new AuthFailErr(generic_not_auth_err));
                }
            }
            const [insert_result, insert_err] = await query_helper(connection, "INSERT IGNORE INTO following(username, artist_name) VALUES (?, ?)", [viewer_name, user_name]);
            if (insert_err) {
                console.log(insert_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (insert_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                await commit_helper(connection, next, loopController);
                if (!loopController.current) return;
                return await connection_release_helper(connection, next, undefined, res.status(200).json({}));
            }
        }
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const removeFollowingHandler: RequestHandler = async (req, res, next) => {
    const viewer_name = res.locals.user_name;
    const user_name = req.body.user_name;
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [result, err] = await query_helper(connection, "DELETE FROM following WHERE username = ? AND artist_name = ?", [viewer_name, user_name])
            if (err) {
                console.log(err.code);
                if (err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            return await connection_release_helper(connection, next, undefined, res.status(200).json({}));
        }
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const getFollowingList: RequestHandler = async (req, res, next) => {
    const viewer_name = res.locals.user_name;
    const page_no = (req.query.page_no) ? parseInt(req.query.page_no as string) : 1;
    const limit = (req.query.limit) ? parseInt(req.query.limit as string) : 20;
    const offset = (page_no - 1) * limit;
    let query_arr: any[] = [];
    let count_pages = 1;
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [count, count_err] = await query_helper(connection, "SELECT COUNT(*) AS count FROM following WHERE following.username = ?", [viewer_name]);
            if (count_err) {
                console.log(count_err.code);
                if (count_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [result, err] = await query_helper(connection, "SELECT profile_pic_id, profile_pic_version, users.username AS username FROM users, following WHERE users.username = following.artist_name AND following.username = ? ORDER BY users.username ASC LIMIT ? OFFSET ?", [viewer_name, limit, offset]);
            if (err) {
                console.log(err.code);
                if (err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                count_pages = Math.ceil(count[0].count/limit);
                query_arr = result;
                break;
            }
        }
        const result_arr = query_arr.map((item: any) => {
            const user_name: string = item.username;
            const profile_pic: string | null = (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id, {
                version: item.profile_pic_version,
                secure: true,
            }) : null;
            const user : IUser = {
                user_name,
                profile_pic,
            }
            return user;
        })
        const response: IResponse<FollowList> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: {
                follow_list: result_arr,
                count_pages,
            },
        }
        return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}