import jwt from "jsonwebtoken";
import path from "path";
import dotenv from "dotenv";
import { CookieOptions, RequestHandler } from "express";
import {AuthFailErr} from "../error_handling/AuthFailErr";

if (process.env.NODE_ENV !== "production") {
    dotenv.config({
        path: path.join(__dirname, "../../../.env"),
    })
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const one_day = 1000 * 60 * 60 * 24;
const one_year = one_day * 365;

const access_token_options : CookieOptions = {
    httpOnly: true,
    maxAge: one_day,
    sameSite: 'lax',
}

const refresh_token_options : CookieOptions = {
    httpOnly: true,
    maxAge: one_year,
    sameSite: 'lax',
}

const clearOptions : CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
}

const isAuthenticated: RequestHandler = async (req, res, next) => {
    console.log('trying to verify token');
    const access_token = req.cookies && req.cookies.access_token;
    const refresh_token = req.cookies && req.cookies.refresh_token;
    const [decoded_access, error_access] = (access_token) ? await verifyJWT(access_token) : [null, new Error()];
    if (error_access) {
        console.log('access_token expired...attempting to use refresh_token');
        const [decoded_refresh, error_refresh] = (refresh_token) ? await verifyJWT(refresh_token) : [null, new Error()];
        if (error_refresh) {
            console.log("refresh_token expired...")
            next(new AuthFailErr("You are not authenticated"))
        } else {
            const user_name = decoded_refresh.user_name;
            console.log(`refresh_token succeeded for: ${user_name}`);
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
        console.log(`access_token succeeded for: ${res.locals.user_name}`);
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

export { verifyJWT, signJWT, one_day, one_year, access_token_options, refresh_token_options, clearOptions };

export default isAuthenticated;