import express from "express";
import { addCommentsHandler, removeCommentsHandler } from "../controllers/comments_controller";
import { commentValidator } from "../controllers/comments_controller_helper";
import { get_user_name } from "../controllers/posts_controller_helper";
import isAuthenticated from "../utils/jwt/jwt-util";

const comments_router = express.Router({mergeParams: true});

comments_router.post('/add_comments', isAuthenticated, commentValidator, addCommentsHandler);

comments_router.post('/remove_comments', isAuthenticated, removeCommentsHandler);

export default comments_router;