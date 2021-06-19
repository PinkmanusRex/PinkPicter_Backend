import { RequestHandler } from "express";
import { AuthFailErr } from "../utils/error_handling/AuthFailErr";
import { ServErr } from "../utils/error_handling/ServErr";
import { generic_db_msg, generic_fail_to_get_connection, generic_user_nf_err } from "../utils/generic_error_msg";
import { IComment, IResponse, RES_TYPE } from "../utils/interfaces/response-interface";
import mysql_pool, { commit_helper, connection_release_helper, query_helper, rollback_helper, transaction_helper } from "../utils/mysql/mysql-util";

export const addCommentsHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    const post_id = req.body.post_id;
    const comment_content = req.body.comment;
    console.log(`${user_name} attempting to comment on ${post_id}`);
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
            const [lock, lock_err] = await query_helper(connection, "SELECT * FROM users WHERE username = ? FOR UPDATE", [user_name]);
            if (lock_err) {
                if (lock_err.code.match(/DEADLOCK/g)) {
                    console.log(lock_err.code);
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    continue;
                } else {
                    console.log(lock_err.code);
                    await rollback_helper(connection, next, loopController);
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [insertion_res, insertion_res_err] = await query_helper(connection, "INSERT INTO comments(post_public_id, username, comment_content, post_date) VALUES(?, ?, ?, ?)", [post_id, user_name, comment_content, new Date()])
            if (insertion_res_err) {
                if (insertion_res_err.code.match(/DEADLOCK/g)) {
                    console.log(insertion_res_err.code);
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    continue;
                } else if (insertion_res_err.code.match(/ER_NO_REFERENCED_ROW/g)) {
                    console.log(insertion_res_err.code);
                    await rollback_helper(connection, next, loopController);
                    if(!loopController.current) return;
                    return await connection_release_helper(connection, next, new AuthFailErr(generic_user_nf_err));
                } else {
                    console.log(insertion_res_err.code);
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [date, date_err] = await query_helper(connection, "SELECT post_date FROM comments WHERE comment_id = ?", [insertion_res.insertId]);
            if (date_err) {
                if (date_err.code.match(/DEADLOCK/g)) {
                    console.log(date_err.code);
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    continue;
                } else {
                    console.log(date_err.code);
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (date.length <= 0) {
                    console.log("Could not get the comment post date");
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            await commit_helper(connection, next, loopController);
            if (!loopController.current) return;
            const response: IResponse<Omit<IComment, "poster"|"comment">> = {
                type: RES_TYPE.POST_SUCCESS,
                payload: {
                    comment_id: insertion_res.insertId,
                    post_date: date[0].post_date,
                }
            }
            console.log(`Sending back comment no.${insertion_res.insertId}`);
            return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
        }
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const removeCommentsHandler: RequestHandler = async (req, res, next) => {
    const viewer_name = res.locals.user_name;
    const comment_id = req.body.comment_id;
    console.log(`Attempting to delete comment no.${comment_id}`);
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [del, del_err] = await query_helper(connection, "DELETE FROM comments WHERE comment_id = ? AND username = ?", [comment_id, viewer_name]);
            if (del_err) {
                if (del_err.code.match(/DEADLOCK/g)) {
                    console.log(del_err.code);
                    continue;
                } else {
                    console.log(del_err.code);
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