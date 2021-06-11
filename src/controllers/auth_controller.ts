import { RequestHandler } from "express";
import bcryptjs from "bcryptjs";
import mysql_pool, { query_helper } from "../utils/mysql/mysql-util";
import { signJWT, access_token_options, refresh_token_options } from "../utils/jwt/jwt-util";
import cloudinaryV2 from "../utils/cloudinary/cloudinary-util";
import { IErrPayload, IResponse, IUser, RES_TYPE } from "../utils/interfaces/response-interface";

const validateUsernamePassword = (username: string, password: string) => {
    return !!(username.match(/^[a-zA-Z0-9_]{8,20}$/g) && password.match(/^[a-zA-Z0-9_]{8,20}$/g));
}

export const registrationHandler: RequestHandler = async (req, res, next) => {
    const user_name = req.body.user_name;
    const password = req.body.password;
    if (!validateUsernamePassword(user_name, password)) {
        const response: IResponse<IErrPayload> = {
            type: RES_TYPE.REGISTER_ERR,
            payload: {
                msg: "Invalid username or password syntax. Must match regex '^[a-zA-Z0-9_]{8, 20}$'"
            }
        }
        return res.status(422).json(response);
    }
    const salt = bcryptjs.genSaltSync(10);
    const bcrypt_password = bcryptjs.hashSync(password, salt);
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [result, error] = await query_helper(connection, "INSERT INTO users(username, password) VALUES(?, ?)", [user_name, bcrypt_password]);
            if (error) {
                if (error.code === 'ER_DUP_KEY') {
                    const response: IResponse<IErrPayload> = {
                        type: RES_TYPE.REGISTER_ERR,
                        payload: {
                            msg: "Username already taken.",
                        }
                    }
                    await connection.release();
                    return res.status(422).json(response);
                } else if (error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    console.log(error.code);
                    const response: IResponse<IErrPayload> = {
                        type: RES_TYPE.SERVER_ERROR,
                        payload: {
                            msg: "Something went wrong in database."
                        }
                    }
                    await connection.release();
                    return res.status(500).json(response);
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
        const response: IResponse<IErrPayload> = {
            type: RES_TYPE.SERVER_ERROR,
            payload: {
                msg: "Could not get database connection.",
            }
        }
        return res.status(500).json(response);
    }
}

export const loginHandler : RequestHandler = async (req, res, next) => {
    const user_name = req.body.user_name;
    const user_password = req.body.password;
    try {
        const connection = await mysql_pool.getConnection();
        while (true) {
            const [result, error] = await query_helper(connection, "SELECT username, password, profile_pic_id, banner_public_id FROM users WHERE username = ?", [user_name]);
            if (error) {
                if (error.code.match(/DEADLOCK/g)) {
                    continue;
                } else {
                    console.log(error.code);
                    const response: IResponse<IErrPayload> = {
                        type: RES_TYPE.SERVER_ERROR,
                        payload: {
                            msg: "Something went wrong in database",
                        }
                    }
                    await connection.release();
                    return res.status(500).json(response);
                }
            } else {
                if (result.length === 0) {
                    const response: IResponse<IErrPayload> = {
                        type: RES_TYPE.LOGIN_FAILURE,
                        payload: {
                            msg: "User credentials incorrect",
                        }
                    }
                    await connection.release();
                    return res.status(401).json(response);
                } else {
                    const {username, password, profile_pic_id, banner_public_id} = result[0];
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
                        const response: IResponse<IErrPayload> = {
                            type: RES_TYPE.LOGIN_FAILURE,
                            payload: {
                                msg: "User credentials incorrect",
                            }
                        }
                        await connection.release();
                        return res.status(401).json(response);
                    }
                }
            }
        }
    } catch (e) {
        const response: IResponse<IErrPayload> = {
            type: RES_TYPE.SERVER_ERROR,
            payload: {
                msg: "Could not get a database connection"
            }
        }
        return res.status(500).json(response);
    }
}

export const logoutHandler : RequestHandler = async (req, res, next) => {
    const response : IResponse<null> = {
        type: RES_TYPE.LOGOUT_SUCCESS,
    }
    return res
            .status(200)
            .clearCookie("access_token", {
                httpOnly: true,
            })
            .clearCookie("refresh_token", {
                httpOnly: true,
            })
            .json(response)
}

export const verifyAuth : RequestHandler = async (req, res, next) => {
    const user_name = res.locals.user_name;
    if (user_name) {
        try {
            const connection = await mysql_pool.getConnection();
            while (true) {
                const [result, error] = await query_helper(connection, "SELECT username, profile_pic_id, banner_public_id FROM users WHERE username = ?", [user_name]);
                if (error) {
                    if (error.code.match(/DEADLOCK/g)) {
                        continue;
                    } else {
                        console.log(error.code);
                        const response : IResponse<IErrPayload> = {
                            type: RES_TYPE.SERVER_ERROR,
                            payload: {
                                msg: "Something went wrong in database",
                            }
                        }
                        await connection.release();
                        return res.status(500).json(response);
                    }
                } else {
                    if (result.length == 0) {
                        const response: IResponse<IErrPayload> = {
                            type: RES_TYPE.NOT_AUTHENTICATED,
                            payload: {
                                msg: "Invalid authentication",
                            }
                        }
                        await connection.release();
                        return res
                                .status(401)
                                .clearCookie("access_token", {
                                    httpOnly: true,
                                })
                                .clearCookie("refresh_token", {
                                    httpOnly: true,
                                })
                                .json(response);
                    } else {
                        const {username, profile_pic_id, banner_public_id} = result[0];
                        const profile_pic_url = (profile_pic_id) ? await cloudinaryV2.url(profile_pic_id) : null;
                        const banner_pic_url = (banner_public_id) ? await cloudinaryV2.url(banner_public_id) : null;
                        const response : IResponse<IUser> = {
                            type: RES_TYPE.AUTH_SUCCESS,
                            payload: {
                                user_name: username,
                                profile_pic: profile_pic_url,
                                banner_pic: banner_pic_url,
                            }
                        }
                        await connection.release();
                        return res.status(200).json(response);
                    }
                }
            }
        } catch (error) {
            const response: IResponse<IErrPayload> = {
                type: RES_TYPE.SERVER_ERROR,
                payload: {
                    msg: "Could not get a database connection",
                }
            }
            return res.status(500).json(response);
        }
    } else {
        const response : IResponse<IErrPayload> = {
            type: RES_TYPE.NOT_AUTHENTICATED,
            payload: {
                msg: "No tokens to verify"
            }
        }
        return res.status(401).json(response);
    }
}