import { RequestHandler } from "express";
import bcryptjs from "bcryptjs";
import mysql_pool, { query_helper } from "../utils/mysql/mysql-util";
import { signJWT, access_token_options, refresh_token_options, clearOptions } from "../utils/jwt/jwt-util";
import cloudinaryV2, {uploadProfilePic, uploadBannerPic} from "../utils/cloudinary/cloudinary-util";
import { IProfile, IResponse, IUser, RES_TYPE } from "../utils/interfaces/response-interface";
import { AuthFailErr } from "../utils/error_handling/AuthFailErr";
import { ServErr } from "../utils/error_handling/ServErr";
import { UpdateFailErr } from "../utils/error_handling/UpdateFailErr";
import {multerFields} from "../utils/multer/multer-util";

const validateUsernamePassword = (username: string, password: string) => {
    return !!(username.match(/^[a-zA-Z0-9_]{8,20}$/g) && password.match(/^[a-zA-Z0-9_]{8,20}$/g));
}

export const registrationHandler: RequestHandler = async (req, res, next) => {
    const user_name = req.body.user_name;
    const password = req.body.password;
    console.log(`Attempting to register: ${user_name}`);
    if (!validateUsernamePassword(user_name, password)) {
        return next(new AuthFailErr("Invalid username or password. Must be 8 to 20 characters long, letters a through z (lower or upper), numbers, or underscore"));
    }
    const salt = bcryptjs.genSaltSync(10);
    const bcrypt_password = bcryptjs.hashSync(password, salt);
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [result, error] = await query_helper(connection, "INSERT INTO users(username, password) VALUES(?, ?)", [user_name, bcrypt_password]);
            if (error) {
                if (error.code === 'ER_DUP_KEY') {
                    console.log(`${error.code}: ${user_name}`);
                    await connection.release();
                    return next(new AuthFailErr("Username already taken"));
                } else if (error.code.match(/DEADLOCK/g)) {
                    console.log(error.code);
                    continue;
                } else {
                    console.log(error.code);
                    await connection.release();
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                const response: IResponse<IUser> = {
                    type: RES_TYPE.REGISTER_SUCCESS,
                    payload: {
                        user_name: user_name,
                    }
                }
                const access_token_payload = {
                    user_name: user_name,
                }
                const access_token = signJWT(access_token_payload, "1d");
                const refresh_token_payload = {
                    user_name: user_name,
                }
                const refresh_token = signJWT(refresh_token_payload, "1y");
                await connection.release();
                return res
                    .status(200)
                    .cookie("access_token", access_token, access_token_options)
                    .cookie("refresh_token", refresh_token, refresh_token_options)
                    .json(response)
            }
        }
    } catch (error) {
        return next(new ServErr("Could not get a database connection"));
    }
}

export const loginHandler: RequestHandler = async (req, res, next) => {
    const user_name = req.body.user_name;
    const user_password = req.body.password;
    console.log(`Attempting to login: ${user_name}`);
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT username, password, profile_pic_id, banner_public_id FROM users WHERE username = ?", [user_name]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    console.log(error.code);
                    continue;
                } else {
                    console.log(error.code);
                    await connection.release();
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                if (result.length === 0) {
                    await connection.release();
                    return next(new AuthFailErr("User credentials incorrect"));
                } else {
                    const { username, password, profile_pic_id, banner_public_id } = result[0];
                    if (bcryptjs.compareSync(user_password, password)) {
                        const profile_pic_url = (profile_pic_id) ? await cloudinaryV2.url(profile_pic_id) : null;
                        const banner_pic_url = (banner_public_id) ? await cloudinaryV2.url(banner_public_id) : null;
                        const response: IResponse<IUser> = {
                            type: RES_TYPE.LOGIN_SUCCESS,
                            payload: {
                                user_name: username,
                                profile_pic: profile_pic_url,
                                banner_pic: banner_pic_url,
                            }
                        }
                        await connection.release();
                        const access_token = await signJWT({
                            user_name: username,
                        }, "1d");
                        const refresh_token = await signJWT({
                            user_name: username,
                        }, "1y");
                        return res
                            .status(200)
                            .cookie("access_token", access_token, access_token_options)
                            .cookie("refresh_token", refresh_token, refresh_token_options)
                            .json(response);
                    } else {
                        await connection.release();
                        return next(new AuthFailErr("User credentials incorrect"));
                    }
                }
            }
        }
    } catch (e) {
        return next(new ServErr("Could not get a database connection"));
    }
}

export const logoutHandler: RequestHandler = async (req, res, next) => {
    const response: IResponse<null> = {
        type: RES_TYPE.LOGOUT_SUCCESS,
    }
    return res
        .status(200)
        .clearCookie("access_token", clearOptions)
        .clearCookie("refresh_token", clearOptions)
        .json(response)
}

export const verifyAuth: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    console.log(`Attempting to verify: ${user_name}`);
    if (user_name) {
        try {
            const connection = await mysql_pool.getConnection();
            while (true) {
                const [result, error] = await query_helper(connection, "SELECT username, profile_pic_id, banner_public_id FROM users WHERE username = ?", [user_name]);
                if (error) {
                    if (error.code.match(/DEADLOCK/g)) {
                        console.log(error.code);
                        continue;
                    } else {
                        console.log(error.code);
                        await connection.release();
                        return next(new ServErr("Something went wrong in database"));
                    }
                } else {
                    if (result.length == 0) {
                        console.log(`Verifying failed for : ${user_name}`);
                        await connection.release();
                        return next(new AuthFailErr("Invalid authentication"));
                    } else {
                        await connection.release();
                        const { username, profile_pic_id, banner_public_id } = result[0];
                        const profile_pic_url = (profile_pic_id) ? await cloudinaryV2.url(profile_pic_id) : null;
                        const banner_pic_url = (banner_public_id) ? await cloudinaryV2.url(banner_public_id) : null;
                        const response: IResponse<IUser> = {
                            type: RES_TYPE.AUTH_SUCCESS,
                            payload: {
                                user_name: username,
                                profile_pic: profile_pic_url,
                                banner_pic: banner_pic_url,
                            }
                        }
                        console.log(`Verification success: ${user_name}`);
                        return res.status(200).json(response);
                    }
                }
            }
        } catch (error) {
            return next(new ServErr("Could not get a database connection"));
        }
    } else {
        return next(new AuthFailErr("No token to verify"));
    }
}

export const editProfileHandler: RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    let banner_return_url : string | null = null;
    let profile_return_url : string | null = null;
    try {
        let connection = await mysql_pool.getConnection();
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT username FROM users WHERE username = ?", [user_name]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    console.log(error.code);
                    await connection.release();
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                if (result.length === 0) {
                    await connection.release();
                    return next(new AuthFailErr("User not found"));
                } else {
                    await connection.release();
                    break;
                }
            }
        }
        if (req.files) {
            const files = req.files as multerFields;
            if (files.profile_pic && files.profile_pic.length > 0) {
                const profile_pic = files.profile_pic[0];
                const [cld_result, cld_error] = await uploadProfilePic(profile_pic, user_name);
                if (cld_error) {
                    console.log(cld_error.message);
                    return next(new ServErr(cld_error.message));
                } else {
                    connection = await mysql_pool.getConnection();
                    while (true) {
                        const [result, error] = await query_helper(connection, "UPDATE users SET profile_pic_id = ? WHERE username = ?", [cld_result!.public_id, user_name]);
                        if (error) {
                            if (error.code.match(/DEADLOCK/g)) {
                                console.log(error.code);
                                continue;
                            } else {
                                console.log(error.code);
                                await connection.release();
                                return next(new ServErr("Something went wrong in the database"));
                            }
                        } else {
                            await connection.release();
                            if (result && result.affectedRows && result.affectedRows <= 0) {
                                return next(new AuthFailErr("User not found"));
                            }
                            profile_return_url = cld_result!.url;
                            break;
                        }
                    }
                }
            }
            if (files.banner_pic && files.banner_pic.length > 0) {
                const banner_pic = files.banner_pic[0];
                const [cld_result, cld_error] = await uploadBannerPic(banner_pic, user_name);
                if (cld_error) {
                    console.log(cld_error.message);
                    return next(new ServErr(cld_error.message));
                } else {
                    connection = await mysql_pool.getConnection();
                    while (true) {
                        const [result, error] = await query_helper(connection, "UPDATE users SET banner_public_id = ? WHERE username = ?", [cld_result!.public_id, user_name]);
                        if (error) {
                            if (error.code.match(/DEADLOCK/g)) {
                                continue;
                            } else {
                                console.log(error.code);
                                await connection.release();
                                return next(new ServErr("Something went wrong in the database"));
                            }
                        } else {
                            await connection.release();
                            if (result && result.affectedRows && result.affectedRows <= 0) {
                                return next(new AuthFailErr("User not found"));
                            }
                            banner_return_url = cld_result!.url;
                            break;
                        }
                    }
                }
            }
        }
        const summary = req.body.summary;
        connection = await mysql_pool.getConnection();
        while (true) {
            const [result, error] = await query_helper(connection, "UPDATE users SET summary = ? WHERE username = ?", [summary, user_name]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    console.log(error.code);
                    continue;
                } else {
                    console.log(error.code);
                    await connection.release();
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                await connection.release();
                if (result && result.affectedRows && result.affectedRows <= 0) {
                    return next(new AuthFailErr("User not found"));
                }
                const response : IResponse<IUser> = {
                    type: RES_TYPE.AUTH_SUCCESS,
                    payload: {
                        user_name: user_name,
                        profile_pic: profile_return_url,
                        banner_pic: banner_return_url,
                    }
                }
                return res
                        .status(200)
                        .json(response);
            }
        }
    } catch (e) {
        return next(new ServErr("Could not get a database connection"));
    }
}

export const getInfoHandler : RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT username, summary, banner_public_id, profile_pic_id FROM users WHERE username = ?", [user_name]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    console.log(error.code);
                    await connection.release();
                    return next(new ServErr("Something went wrong in the database"));
                }
            } else {
                if (result.length <= 0) {
                    await connection.release();
                    return next(new AuthFailErr("User not found"));
                } else {
                    await connection.release();
                    const {
                        username,
                        summary,
                        banner_public_id,
                        profile_pic_id,
                    } = result[0];
                    const profile_pic_url = (profile_pic_id) ? await cloudinaryV2.url(profile_pic_id) : null;
                    const banner_pic_url = (banner_public_id) ? await cloudinaryV2.url(banner_public_id) : null;
                    const response : IResponse<IProfile> = {
                        type: RES_TYPE.AUTH_SUCCESS,
                        payload: {
                            user_name: username,
                            summary: summary,
                            profile_pic: profile_pic_url,
                            banner_pic: banner_pic_url,
                        }
                    }
                    return res.status(200).json(response);
                }
            }
        }
    } catch (e) {
        return next(new ServErr("Could not get a database connection"));
    }
}