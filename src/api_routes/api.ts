import express from "express";
import auth_router from "./auth_routes";
import posts_router from "./posts_route";

const api_router = express.Router({mergeParams: true});

api_router.use("/auth", auth_router);
api_router.use("/post", posts_router);

export default api_router;