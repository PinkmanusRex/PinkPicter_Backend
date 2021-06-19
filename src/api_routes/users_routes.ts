import express from "express";
import { get_user_name } from "../controllers/posts_controller_helper";
import {getUserFavoritesHandler, getUserInfoHandler, getUserPostsHandler} from "../controllers/user_controller";
import { searchQueryValidator } from "../utils/searching/search_helper";

const users_router = express.Router({mergeParams: true});

users_router.get("/get_profile/:user_name", get_user_name, getUserInfoHandler);

users_router.get("/get_favorites/:user_name", searchQueryValidator, getUserFavoritesHandler);

users_router.get("/get_posts/:user_name", searchQueryValidator, getUserPostsHandler);


export default users_router;