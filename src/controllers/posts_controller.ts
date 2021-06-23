import { RequestHandler } from "express";
import cloudinary from "cloudinary";
import mysql_pool, { commit_helper, connection_release_helper, query_helper, rollback_helper, transaction_helper } from "../utils/mysql/mysql-util";
import cloudinaryV2, { deletePostPic, ICloudUploadResponse, uploadPostPic } from "../utils/cloudinary/cloudinary-util";
import { ServErr } from "../utils/error_handling/ServErr";
import { AuthFailErr } from "../utils/error_handling/AuthFailErr";
import { IComment, IPostInfo, IPostPayload, IResponse, ISearchPayload, IUser, RES_TYPE } from "../utils/interfaces/response-interface";
import { NotFoundErr } from "../utils/error_handling/NotFoundErr";
import { generic_db_msg, generic_fail_to_get_connection, generic_not_auth_err, generic_post_nf_err, generic_user_nf_err } from "../utils/generic_error_msg";

;

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
                console.log("Could not begin a transaction");
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
            const [check, check_error] = await query_helper(connection, "SELECT username FROM users WHERE username = ?", [user_name]);
            if (check_error) {
                console.log(check_error.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (check_error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (check.length === 0) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new AuthFailErr(generic_user_nf_err));
                }
            }
            const post_pic = req.file as Express.Multer.File;
            const [cld_result, cld_error]: [ICloudUploadResponse | null, cloudinary.UploadApiErrorResponse | null] = await uploadPostPic(post_pic, user_name, public_id);
            if (cld_error) {
                console.log(cld_error.message);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                return await connection_release_helper(connection, next, new ServErr(cld_error.message));
            } else {
                public_id = (cld_result as ICloudUploadResponse).public_id;
                const width = (cld_result as ICloudUploadResponse).width;
                const height = (cld_result as ICloudUploadResponse).height;
                const [result, error] = await query_helper(connection, "INSERT INTO posts(post_public_id, post_date, width, height, description, title, artist_name) VALUES(?, ?, ?, ?, ?, ?, ?)", [public_id, new Date(), width, height, req.body.description, req.body.title, user_name]);
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
                    await commit_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    const response: IResponse<{ post_id: string }> = {
                        type: RES_TYPE.POST_SUCCESS,
                        payload: {
                            post_id: public_id,
                        }
                    }
                    return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
                }
            }
        }
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const getPostHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    const post_id = req.params.post_id;
    console.log(`${user_name} attempting to retrieve ${post_id}`);
    try {
        const connection = await mysql_pool.getConnection();
        let query_comments: any = [];
        let query_post: any = null;
        const loopController = {
            current: true,
        }
        while (loopController.current) {
            const err = await transaction_helper(connection);
            if (err) {
                console.log("Could not begin a transaction");
                return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
            }
            const [user_lock, user_lock_err] = await query_helper(connection, "SELECT * FROM users WHERE username = ? FOR UPDATE", [user_name]);
            if (user_lock_err) {
                console.log(user_lock_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (user_lock_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [post, post_err] = await query_helper(connection, "SELECT IF(EXISTS(SELECT * FROM favorites WHERE post_public_id = ? AND username = ?), TRUE, FALSE) as favorited, post_public_id, artist_name, title, description, width, height, post_date, profile_pic_id, profile_pic_version FROM posts, users WHERE artist_name = username AND post_public_id = ?", [post_id, user_name, post_id]);
            if (post_err) {
                console.log(post_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (post_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (post.length === 0) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new NotFoundErr(generic_post_nf_err));
                }
            }
            const [comments, comments_err] = await query_helper(connection, "SELECT c.username as username, c.comment_content as comment_content, c.post_date as post_date, c.comment_id as comment_id, profile_pic_id, profile_pic_version FROM comments as c, users WHERE c.username = users.username AND c.post_public_id = ? ORDER BY c.comment_id DESC", [post_id]);
            if (comments_err) {
                console.log(comments_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (comments_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                query_comments = comments;
                query_post = post[0];
                await commit_helper(connection, next, loopController);
                if (!loopController.current) return;
                break;
            }
        }
        const comments_arr = query_comments.map((item: any) => {
            const user_name: string = item.username;
            const profile_pic: string | null = (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id, {
                version: item.profile_pic_version,
            }) : null;
            const commenter: IUser = {
                user_name,
                profile_pic,
            }
            const comment: IComment = {
                comment_id: item.comment_id,
                poster: commenter,
                post_date: item.post_date,
                comment: item.comment_content,
            }
            return comment;
        })
        const post: IPostInfo = {
            title: query_post.title,
            src: cloudinaryV2.url(query_post.post_public_id),
            post_id: query_post.post_public_id,
            user: {
                user_name: query_post.artist_name,
                profile_pic: query_post.profile_pic_id ? cloudinaryV2.url(query_post.profile_pic_id, {
                    version: query_post.profile_pic_version,
                }) : null,
            },
            width: query_post.width,
            height: query_post.height,
            description: query_post.description,
            favorited: !!query_post.favorited,
            post_date: query_post.post_date,
        }
        const response: IResponse<IPostPayload> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: {
                post: post,
                comments: comments_arr,
            }
        }
        return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
    } catch (e) {
        console.log("Could not get a database connection");
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const addFavoritesHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    const post_id = req.body.post_id;
    if (!user_name) {
        return next(new AuthFailErr(generic_not_auth_err));
    }
    console.log(`${user_name} trying to add ${post_id} to favorites`);
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
                console.log(lock_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (lock_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            const [check_user, check_user_error] = await query_helper(connection, "SELECT * FROM users WHERE username = ?", [user_name]);
            if (check_user_error) {
                console.log(check_user_error.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (check_user_error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (check_user.length === 0) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new AuthFailErr(generic_user_nf_err));
                }
            }
            const [add_fav_result, add_fav_result_error] = await query_helper(connection, "INSERT IGNORE INTO favorites (username, post_public_id, favorite_date) VALUES (?, ?, ?)", [user_name, post_id, new Date()]);
            if (add_fav_result_error) {
                console.log(add_fav_result_error.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (add_fav_result_error.code.match(/DEADLOCK/g)) {
                    continue;
                } else if (add_fav_result_error.code.match(/ER_NO_REFERENCED_ROW/g)) {
                    return await connection_release_helper(connection, next, new NotFoundErr(generic_post_nf_err))
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                await commit_helper(connection, next, loopController);
                if (!loopController.current) return;
                return await connection_release_helper(connection, next, undefined, res.status(200).json({}))
            }
        }
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const removeFavoritesHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    const post_id = req.body.post_id;
    if (!user_name) {
        return next(new AuthFailErr(generic_not_auth_err));
    }
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [check_user, check_user_error] = await query_helper(connection, "SELECT * FROM users WHERE username = ?", [user_name]);
            if (check_user_error) {
                if (check_user_error.code.match(/DEADLOCK/g)) {
                    console.log(check_user_error.code);
                    continue;
                } else {
                    console.log(check_user_error.code);
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (check_user.length === 0) {
                    console.log(generic_user_nf_err);
                    return await connection_release_helper(connection, next, new AuthFailErr(generic_user_nf_err));
                }
            }
            const [delete_result, delete_result_err] = await query_helper(connection, "DELETE FROM favorites WHERE username = ? AND post_public_id = ?", [user_name, post_id]);
            if (delete_result_err) {
                if (delete_result_err.code.match(/DEADLOCK/g)) {
                    console.log(delete_result_err.code);
                    continue;
                } else {
                    console.log(delete_result_err.code);
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                return await connection_release_helper(connection, next, undefined, res.status(200).json({}));
            }
        }
    } catch (e) {
        console.log(generic_fail_to_get_connection);
        return next(new ServErr(generic_fail_to_get_connection));
    }
}

export const getTrendingPostsHandler: RequestHandler = async (req, res, next) => {
    const page_no = (req.query.page_no) ? parseInt(req.query.page_no as string) : 1;
    const limit = (req.query.limit) ? parseInt(req.query.limit as string) : 20;
    const offset = (page_no - 1) * limit;
    console.log(`Retrieving trending posts page=${page_no}`);
    try {
        const connection = await mysql_pool.getConnection();
        let count_pages = 0;
        let query_arr: any = [];
        while (true) {
            const [count, count_err] = await query_helper(connection, "SELECT COUNT(*) AS count FROM posts", [])
            if (count_err) {
                console.log(count_err.code);
                if (count_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            console.log(`There are ${count[0].count} posts`);
            const cur_date = new Date();
            const [result, err] = await query_helper(connection, `SELECT post_public_id, width, height, title, artist_name, profile_pic_id, profile_pic_version FROM posts, users WHERE username = artist_name ORDER BY 
            (SELECT count_favorites + count_comments FROM 
                (SELECT COUNT(*) AS count_favorites FROM favorites WHERE posts.post_public_id = favorites.post_public_id AND favorite_date 
                    BETWEEN DATE_SUB(?, INTERVAL 3 DAY) AND DATE_ADD(?, INTERVAL 4 DAY)) AS f 
                JOIN 
                (SELECT COUNT(*) AS count_comments FROM comments WHERE posts.post_public_id = comments.post_public_id AND post_date 
                    BETWEEN DATE_SUB(?, INTERVAL 3 DAY) AND DATE_ADD(?, INTERVAL 4 DAY)) AS c
            ) DESC LIMIT ? OFFSET ?`, [cur_date, cur_date, cur_date, cur_date, limit, offset]);
            if (err) {
                console.log(err.code);
                if (err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                count_pages = Math.ceil(count[0].count / limit);
                query_arr = result;
                break;
            }
        }
        const result_arr = query_arr.map((item: any) => {
            const title: string = item.title;
            const src: string = cloudinaryV2.url(item.post_public_id);
            const post_id: string = item.post_public_id;
            const user: IUser = {
                user_name: item.artist_name,
                profile_pic: (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id, {
                    version: item.profile_pic_version,
                }) : null,
            }
            const width: number = item.width;
            const height: number = item.height;
            const post: IPostInfo = {
                src,
                post_id, user,
                width,
                height,
                title,
            }
            return post;
        })
        const response: IResponse<ISearchPayload> = {
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

export const getSearchPostsHandler: RequestHandler = async (req, res, next) => {
    const query_terms = req.query.q;
    let sql_query = '';
    let count_query = '';
    let count_escape_arr: any[] = [];
    let sql_escape_arr = [];
    const page_no = (req.query.page_no) ? parseInt(req.query.page_no as string) : 1;
    const limit = (req.query.limit) ? parseInt(req.query.limit as string) : 20;
    const offset = (page_no - 1) * limit;
    if (query_terms) {
        sql_query = `SELECT post_public_id, width, height, title, artist_name, profile_pic_id, profile_pic_version FROM posts, users WHERE username = artist_name AND MATCH(title) AGAINST(?) ORDER BY post_id DESC LIMIT ? OFFSET ?`;
        sql_escape_arr = [query_terms, limit, offset];
        count_query = "SELECT COUNT(*) AS count FROM posts WHERE MATCH(title) AGAINST(?)";
        count_escape_arr = [query_terms];
    } else {
        sql_query = `SELECT post_public_id, width, height, title, artist_name, profile_pic_id, profile_pic_version FROM posts, users WHERE username = artist_name ORDER BY post_id DESC LIMIT ? OFFSET ?`
        sql_escape_arr = [limit, offset];
        count_query = "SELECT COUNT(*) AS count FROM posts";
        count_escape_arr = [];
    }
    console.log(`${query_terms ? `Retrieving posts matching against ${query_terms}` : 'Retrieving posts'} page=${page_no}`);
    try {
        const connection = await mysql_pool.getConnection();
        let count_pages = 0;
        let query_arr: any = [];
        while (true) {
            const [count, count_err] = await query_helper(connection, count_query, count_escape_arr)
            if (count_err) {
                console.log(count_err.code);
                if (count_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            console.log(`There are ${count[0].count} posts`);
            const [result, err] = await query_helper(connection, sql_query, sql_escape_arr);
            if (err) {
                console.log(err.code);
                if (err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                count_pages = Math.ceil(count[0].count / limit);
                query_arr = result;
                break;
            }
        }
        const result_arr = query_arr.map((item: any) => {
            const title: string = item.title;
            const src: string = cloudinaryV2.url(item.post_public_id);
            const post_id: string = item.post_public_id;
            const user: IUser = {
                user_name: item.artist_name,
                profile_pic: (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id, {
                    version: item.profile_pic_version,
                }) : null,
            }
            const width: number = item.width;
            const height: number = item.height;
            const post: IPostInfo = {
                src,
                post_id, user,
                width,
                height,
                title,
            }
            return post;
        })
        const response: IResponse<ISearchPayload> = {
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

export const getUserFollowingPostsHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    const page_no = (req.query.page_no) ? parseInt(req.query.page_no as string) : 1;
    const limit = (req.query.limit) ? parseInt(req.query.limit as string) : 20;
    const offset = (page_no - 1) * limit;
    console.log(`Retrieving posts by ${user_name}'s following list page=${page_no}`);
    try {
        const connection = await mysql_pool.getConnection();
        let count_pages = 0;
        let query_arr: any = [];
        while (true) {
            const [count, count_err] = await query_helper(connection, "SELECT COUNT(*) AS count FROM posts, following WHERE posts.artist_name = following.artist_name AND following.username = ?", [user_name]);
            if (count_err) {
                console.log(count_err.code);
                if (count_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            }
            console.log(`There are ${count[0].count} posts`);
            const [result, err] = await query_helper(connection, "SELECT post_public_id, width, height, title, posts.artist_name AS artist_name, profile_pic_id, profile_pic_version FROM posts, users, following WHERE users.username = posts.artist_name AND posts.artist_name = following.artist_name AND following.username = ? ORDER BY post_id DESC LIMIT ? OFFSET ?", [user_name, limit, offset]);
            if (err) {
                console.log(err.code);
                if (err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                count_pages = Math.ceil(count[0].count / limit);
                query_arr = result;
                break;
            }
        }
        const result_arr = query_arr.map((item: any) => {
            const title: string = item.title;
            const src: string = cloudinaryV2.url(item.post_public_id);
            const post_id: string = item.post_public_id;
            const user: IUser = {
                user_name: item.artist_name,
                profile_pic: (item.profile_pic_id) ? cloudinaryV2.url(item.profile_pic_id, {
                    version: item.profile_pic_version,
                }) : null,
            }
            const width: number = item.width;
            const height: number = item.height;
            const post: IPostInfo = {
                src,
                post_id, user,
                width,
                height,
                title,
            }
            return post;
        })
        const response: IResponse<ISearchPayload> = {
            type: RES_TYPE.GET_SUCCESS,
            payload: {
                count_pages: count_pages,
                posts: result_arr,
            }
        }
        return await connection_release_helper(connection, next, undefined, res.status(200).json(response));
    } catch (e) {
        return next(new ServErr(generic_db_msg));
    }
}

export const deletePostHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    const post_id = req.body.post_id;
    console.log(`User ${user_name} attempting to delete ${post_id}`);
    try {
        const connection = await mysql_pool.getConnection();
        const loopController = {
            current: true,
        }
        while (loopController.current) {
            const err = await transaction_helper(connection);
            if (err) {
                console.log("Could not begin a transaction");
                return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
            }
            const [lock, lock_err] = await query_helper(connection, "SELECT * FROM posts WHERE post_public_id = ? FOR UPDATE", [post_id]);
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
            const [check, check_error] = await query_helper(connection, "SELECT artist_name FROM posts WHERE post_public_id = ?", [post_id]);
            if (check_error) {
                console.log(check_error.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (check_error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                if (check.length <= 0) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new NotFoundErr(generic_post_nf_err));
                } else if (check[0].artist_name !== user_name) {
                    await rollback_helper(connection, next, loopController);
                    if (!loopController.current) return;
                    return await connection_release_helper(connection, next, new AuthFailErr(generic_not_auth_err));
                }
            }
            const [del, del_err] = await query_helper(connection, "DELETE FROM posts WHERE post_public_id = ?", [post_id]);
            if (del_err) {
                console.log(del_err.code);
                await rollback_helper(connection, next, loopController);
                if (!loopController.current) return;
                if (del_err.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    return await connection_release_helper(connection, next, new ServErr(generic_db_msg));
                }
            } else {
                await commit_helper(connection, next, loopController);
                if (!loopController.current) return;
                break;
            }
        }
        const [result, error] = await deletePostPic(post_id);
        return await connection_release_helper(connection, next, undefined, res.status(200).json({}));
    } catch (e) {
        return next(new ServErr(generic_fail_to_get_connection));
    }
}