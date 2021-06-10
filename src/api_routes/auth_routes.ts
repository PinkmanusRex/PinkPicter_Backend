import express from "express";
import {registrationHandler, loginHandler, logoutHandler} from "../controllers/auth_controller";

const auth_router = express.Router({mergeParams: true});

auth_router.post("/login", loginHandler)

auth_router.post("/logout", logoutHandler)

auth_router.post("/register", registrationHandler)