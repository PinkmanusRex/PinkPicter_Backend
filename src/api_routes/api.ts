import express from "express";
import auth_router from "./auth_routes";

const api_router = express.Router({mergeParams: true});

api_router.use("/auth", auth_router);

export default api_router;