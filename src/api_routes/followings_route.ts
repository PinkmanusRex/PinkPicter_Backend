import express from "express";
import { addFollowingHandler, removeFollowingHandler } from "../controllers/followings_controller";
import isAuthenticated from "../utils/jwt/jwt-util";

const followings_router = express.Router({mergeParams: true});

followings_router.post('/add', isAuthenticated, addFollowingHandler);

followings_router.post('/remove', isAuthenticated, removeFollowingHandler);

export default followings_router;