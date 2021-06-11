import express from "express";
import {registrationHandler, loginHandler, logoutHandler, verifyAuth} from "../controllers/auth_controller";
import isAuthenticated from "../utils/jwt/jwt-util";

const auth_router = express.Router({mergeParams: true});

auth_router.get("/verify_auth", isAuthenticated, verifyAuth)

auth_router.post("/login", loginHandler)

auth_router.post("/logout", logoutHandler)

auth_router.post("/register", registrationHandler)

export default auth_router;