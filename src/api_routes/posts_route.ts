import express from "express";
import { uploadPostHandler } from "../controllers/posts_controller";
import { postValidator } from "../controllers/posts_controller_helper";
import isAuthenticated from "../utils/jwt/jwt-util";
import multerUtil from "../utils/multer/multer-util";

const posts_router = express.Router({mergeParams: true});

posts_router.post('/upload', isAuthenticated, multerUtil.single('post_pic'), postValidator, uploadPostHandler);

export default posts_router;