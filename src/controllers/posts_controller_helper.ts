import { RequestHandler } from "express";
import { InvalidFieldError } from "../utils/error_handling/InvalidFieldError";

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