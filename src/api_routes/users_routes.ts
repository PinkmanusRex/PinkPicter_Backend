import express from "express";
import {getUserFavoritesHandler, getUserInfoHandler, getUserPostsHandler} from "../controllers/user_controller";
import { searchQueryValidator } from "../utils/searching/search_helper";

const users_router = express.Router({mergeParams: true});

users_router.get("/get_profile/:user_name", getUserInfoHandler);

users_router.get("/get_favorites/:user_id", searchQueryValidator, getUserPostsHandler);

users_router.get("/get_posts/:user_id", searchQueryValidator, getUserFavoritesHandler);

export default users_router;