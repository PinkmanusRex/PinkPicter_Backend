import express from "express";
import { getPostHandler, uploadPostHandler } from "../controllers/posts_controller";
import { get_user_name, postValidator } from "../controllers/posts_controller_helper";
import isAuthenticated from "../utils/jwt/jwt-util";
import multerUtil from "../utils/multer/multer-util";

const posts_router = express.Router({mergeParams: true});

posts_router.post('/upload', isAuthenticated, multerUtil.single('post_pic'), postValidator, uploadPostHandler);

posts_router.post('/get_post', get_user_name, getPostHandler);

export default posts_router;