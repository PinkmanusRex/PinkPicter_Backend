import jwt from "jsonwebtoken";
import path from "path";
import dotenv from "dotenv";
import { RequestHandler } from "express";
import { IErrPayload, IResponse, RES_TYPE } from "../interfaces/response-interface";

dotenv.config({
    path: path.join(__dirname, "../../../.env"),
})

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const one_day = 1000 * 60 * 60 * 24;
const one_year = one_day * 365;

const access_token_options = {
    httpOnly: true,
    maxAge: one_day,
}

const refresh_token_options = {
    httpOnly: true,
    maxAge: one_year,
}

const isAuthenticated: RequestHandler = async (req, res, next) => {
    const access_token = req.cookies && req.cookies.access_token;
    const refresh_token = req.cookies && req.cookies.refresh_token;
    const [decoded_access, error_access] = (access_token) ? await verifyJWT(access_token) : [null, new Error()];
    if (error_access) {
        const [decoded_refresh, error_refresh] = (refresh_token) ? await verifyJWT(refresh_token) : [null, new Error()];
        if (error_refresh) {
            const response : IResponse<IErrPayload> = {
                type: RES_TYPE.NOT_AUTHENTICATED,
                payload: {
                    msg: "You are not authenticated."
                }
            }
            return res
                    .clearCookie("access_token", {
                        httpOnly: true,
                    })
                    .clearCookie("refresh_token", {
                        httpOnly: true,
                    })
                    .json(response)
        } else {
            const user_name = decoded_refresh.user_name;
            const payload = {
                user_name: user_name,
            }
            const access_token = signJWT(payload, "1d");
            res.cookie("access_token", access_token, access_token_options);
            res.locals.user_name = user_name;
            next();
        }
    } else {
        res.locals.user_name = decoded_access.user_name;
        next();
    }
}

const verifyJWT = async (token: string): Promise<[any, any]> => {
    try {
        const payload: any = await new Promise((resolve, reject) => {
            jwt.verify(token, JWT_SECRET, (err, decoded) => {
                if (err) reject(err);
                resolve(decoded);
            })
        })
        return [payload, null];
    } catch (error) {
        return [null, error];
    }
}

const signJWT = (token: { [key: string]: any }, expiresIn: string) => {
    return jwt.sign(token, JWT_SECRET, {
        expiresIn: expiresIn,
    })
}

export { verifyJWT, signJWT, one_day, one_year, access_token_options, refresh_token_options };

export default isAuthenticated;