import express from "express";
import auth_router from "./auth_routes";
import comments_router from "./comments_route";
import followings_router from "./followings_route";
import posts_router from "./posts_route";
import users_router from "./users_routes";

const api_router = express.Router({mergeParams: true});

api_router.use("/auth", auth_router);
api_router.use("/post", posts_router);
api_router.use("/user", users_router);
api_router.use("/comments", comments_router);
api_router.use("/following", followings_router);

export default api_router;