import express from "express";
import { addFavoritesHandler, deletePostHandler, getPostHandler, getSearchPostsHandler, getTrendingPostsHandler, getUserFollowingPostsHandler, removeFavoritesHandler, uploadPostHandler } from "../controllers/posts_controller";
import { get_user_name, postValidator } from "../controllers/posts_controller_helper";
import isAuthenticated from "../utils/jwt/jwt-util";
import multerUtil from "../utils/multer/multer-util";
import { searchQueryValidator } from "../utils/searching/search_helper";

const posts_router = express.Router({mergeParams: true});

posts_router.post('/upload', isAuthenticated, multerUtil.single('post_pic'), postValidator, uploadPostHandler);

posts_router.get('/get_post/:post_id(*)', get_user_name, getPostHandler);

posts_router.post('/add_favorites', get_user_name, addFavoritesHandler);

posts_router.post('/remove_favorites', get_user_name, removeFavoritesHandler);

posts_router.get('/trending', searchQueryValidator, getTrendingPostsHandler);

posts_router.get('/following_user_posts', searchQueryValidator, isAuthenticated, getUserFollowingPostsHandler);

posts_router.get('/search', searchQueryValidator, getSearchPostsHandler);

posts_router.post('/delete', isAuthenticated, deletePostHandler);

export default posts_router;