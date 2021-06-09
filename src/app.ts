import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import api_router from "./api_routes/api";
import {IResponse, RES_TYPE} from "./utils/interfaces/response-interface";

dotenv.config({
    path: path.join(__dirname, "../.env"),
});

console.log(__dirname);

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: "*",
    optionsSuccessStatus: 200,
    credentials: true,
}))

app.use("/api", api_router);

app.use("/", (req, res, next) => {
    const response: IResponse = {
        type: RES_TYPE.NOT_FOUND,
    }
    res.status(404).json(response);
})