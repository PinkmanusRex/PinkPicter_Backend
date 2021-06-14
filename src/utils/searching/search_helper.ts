import { RequestHandler } from "express";
import { InvalidFieldError } from "../error_handling/InvalidFieldError";

const numeric_query_is_pos_number = (numeric_query : string) => {
    try {
        const val = parseInt(numeric_query);
        if (val <= 0) return false;
        return true;
    } catch (e) {
        return false;
    }
}

export const searchQueryValidator : RequestHandler = (req, res, next) => {
    const limit_res = numeric_query_is_pos_number(req.query.limit ? req.query.limit as string : '20');
    const page_no_res = numeric_query_is_pos_number(req.query.page_no ? req.query.page_no as string : '1')
    if (!limit_res || !page_no_res) {
        return next(new InvalidFieldError("Both the limit and page number must be positive integers"));
    } else {
        return next();
    }
}