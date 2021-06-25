import path from "path";
import dotenv from "dotenv";
import express, { ErrorRequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import api_router from "./api_routes/api";
import {IErrPayload, IResponse, RES_TYPE} from "./utils/interfaces/response-interface";
import errorHandler from "./utils/error_handling/error-handler-util";

if (process.env.NODE_ENV !== "production") {
    dotenv.config({
        path: path.join(__dirname, "../.env"),
    });
}

const SERVER_PORT = process.env.PORT || "8080";

const app = express();

app.use(cors({
    origin: [/^http:\/\/localhost/, /pink-picter.netlify.app/],
    optionsSuccessStatus: 200,
    credentials: true,
}))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", api_router);

app.use("/", (req, res, next) => {
    const response: IResponse<IErrPayload> = {
        type: RES_TYPE.NOT_FOUND,
        payload: {
            msg: "404 NOT FOUND.",
        }
    }
    res.status(404).json(response);
})

app.use(errorHandler);

app.listen(SERVER_PORT, () => {
    console.log(`Listening on :${SERVER_PORT}`);
})