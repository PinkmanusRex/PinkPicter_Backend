import { RequestHandler } from "express";
import { InvalidFieldError } from "../utils/error_handling/InvalidFieldError";

export const commentValidator: RequestHandler = async (req, res, next) => {
    const comment = req.body.comment;
    const post_id = req.body.post_id;
    if (!comment || !post_id) {
        return next(new InvalidFieldError("Must provide a comment or post_id"));
    } else {
        if (typeof comment !== 'string') {
            return next(new InvalidFieldError("Must provide a typed comment"));
        } else if (comment.length > 5_000) {
            return next(new InvalidFieldError("Comment must be less than 5000 characters"));
        } else {
            const split_str = comment.split(/\s+/);
            if (!split_str.some(token => token.length >= 3)) {
                return next(new InvalidFieldError("Comment must have at least one word 3 characters or longer"));
            } else {
                return next();
            }
        }
    }
}