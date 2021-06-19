import { RequestHandler } from "express";
import { AuthFailErr } from "../utils/error_handling/AuthFailErr";
import { InvalidFieldError } from "../utils/error_handling/InvalidFieldError";
import { NotFoundErr } from "../utils/error_handling/NotFoundErr";
import { ServErr } from "../utils/error_handling/ServErr";
import { generic_db_msg, generic_fail_to_get_connection, generic_not_auth_err, generic_user_nf_err } from "../utils/generic_error_msg";
import mysql_pool, { commit_helper, connection_release_helper, query_helper, rollback_helper, transaction_helper } from "../utils/mysql/mysql-util";

export const addFollowingHandler: RequestHandler = async (req, res, next) => {
    const viewer_name = res.locals.user_name;
    const user_name = req.params.user_name;
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
            const [lock, lock_err] = await query_helper(connection, "SELECT * FROM users WHERE username IN (?, ?)", [viewer_name, user_name]);
            if (lock_err) {
                console.log(lock_err.code);
                if (lock_err.code.match(/DEADLOCK/g)) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    continue;
                } else {
                    await rollback_helper(connection, next, loopController);
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [check_viewer, check_viewer_err] = await query_helper(connection, "SELECT * FROM users WHERE username = ?", [viewer_name]);
            if (check_viewer_err) {
                console.log(check_viewer_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (check_viewer_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (check_viewer.length <= 0) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new AuthFailErr(generic_not_auth_err));
                }
            }
            const [check_user, check_user_err] = await query_helper(connection, "SELECT * FROM users WHERE username = ?", [user_name]);
            if (check_user_err) {
                console.log(check_user_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (check_user_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (check_user.length <= 0) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new NotFoundErr(generic_user_nf_err));
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
    const user_name = req.params.user_name;
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [result, err] = await query_helper(connection, "DELETE FROM following WHERE username = ? AND artist_name = ?", [viewer_name, user_name])
            if (err) {
                if (err.code.match(/DEADLOCK/g)) {
                    console.log(err.code);
                    continue;
                } else {
                    console.log(err.code);
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