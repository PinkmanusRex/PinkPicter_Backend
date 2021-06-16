import { RequestHandler } from "express";
import { InvalidFieldError } from "../utils/error_handling/InvalidFieldError";
import { access_token_options, signJWT, verifyJWT } from "../utils/jwt/jwt-util";

export const postValidator : RequestHandler = async (req, res, next) => {
    if (!req.file) {
        console.log("Image file not provided");
        return next(new InvalidFieldError("No image provided"));
    }
    if (req.body) {
        if (!req.body.description) {
            console.log("No description provided");
            return next(new InvalidFieldError("Must provide description"));
        }
        if (!req.body.title) {
            console.log("No title provided");
            return next(new InvalidFieldError("Must provide a title"));
        } else {
            if (req.body.title.length < 5 || req.body.title.length > 200) {
                console.log(`Title too long or too short: ${req.body.title.length}`);
                return next(new InvalidFieldError("Title too long or too short"));
            }
        }
        return next();
    } else {
        console.log("No request body");
        return next(new InvalidFieldError("Must provide image file, description and title"));
    }
}

export const get_user_name : RequestHandler = async (req, res, next) => {
    const access_token = req.cookies && req.cookies.access_token;
    const refresh_token = req.cookies && req.cookies.refresh_token;
    const [decoded_access, error_access] = (access_token) ? await verifyJWT(access_token) : [null, new Error()];
    if (error_access) {
        const [decoded_refresh, error_refresh] = (refresh_token) ? await verifyJWT(refresh_token) : [null, new Error()];
        if (error_refresh) {
            res.locals.user_name = '';
            return next();
        } else {
            const user_name = decoded_refresh.user_name;
            const payload = {
                user_name: user_name,
            }
            const access_token = signJWT(payload, "1d");
            res.cookie("access_token", access_token, access_token_options);
            res.locals.user_name = user_name;
            return next();
        }
    } else {
        res.locals.user_name = decoded_access.user_name;
        return next();
    }
}