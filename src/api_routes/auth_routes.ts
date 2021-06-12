import express from "express";
import {registrationHandler, loginHandler, logoutHandler, verifyAuth, editProfileHandler, getInfoHandler} from "../controllers/auth_controller";
import isAuthenticated from "../utils/jwt/jwt-util";
import multerUtil from "../utils/multer/multer-util";

const auth_router = express.Router({mergeParams: true});

auth_router.get("/verify_auth", isAuthenticated, verifyAuth)

auth_router.post("/login", loginHandler)

auth_router.post("/logout", logoutHandler)

auth_router.post("/register", registrationHandler)

auth_router.post("/edit", multerUtil.fields([
    {name: 'profile_pic', maxCount: 1},
    {name: 'banner_pic', maxCount: 1},
]), isAuthenticated, editProfileHandler)

auth_router.get('/info', isAuthenticated, getInfoHandler);

export default auth_router;