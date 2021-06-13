import { ErrorRequestHandler } from "express";
import {clearOptions} from "../jwt/jwt-util";
import {ImpropImgErr} from "./ImproperImgErr";
import {NotFoundErr} from "./NotFoundErr";
import {AuthFailErr} from "./AuthFailErr";
import {ServErr} from "./ServErr";
import {UpdateFailErr} from "./UpdateFailErr";
import { IResponse, IErrPayload, RES_TYPE } from "../interfaces/response-interface";
import { InvalidFieldError } from "./InvalidFieldError";

type ErrorResponse = IResponse<IErrPayload>;

const errorHandler : ErrorRequestHandler = (err, req, res ,next) => {
    switch (err.constructor) {
        case ImpropImgErr : {
            const imgErr : ImpropImgErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.INVALID_FIELD,
                payload: {
                    msg: imgErr.msg,
                }
            }
            console.log(RES_TYPE.INVALID_FIELD)
            return res
                    .status(415)
                    .json(response)
        }
        case NotFoundErr : {
            const nfErr : NotFoundErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.NOT_FOUND,
                payload: {
                    msg: nfErr.msg,
                }
            }
            console.log(RES_TYPE.NOT_FOUND)
            return res
                    .status(404)
                    .json(response)
        }
        case AuthFailErr : {
            const authErr : AuthFailErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.AUTH_FAILURE,
                payload: {
                    msg: authErr.msg,
                }
            }
            console.log(RES_TYPE.AUTH_FAILURE)
            return res
                    .status(401)
                    .clearCookie("access_token", clearOptions)
                    .clearCookie("refresh_token", clearOptions)
                    .json(response)
        }
        case ServErr : {
            const srvErr : ServErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.SERVER_ERROR,
                payload: {
                    msg: srvErr.msg,
                }
            }
            console.log(RES_TYPE.SERVER_ERROR)
            return res
                    .status(500)
                    .json(response)
        }
        case UpdateFailErr : {
            const updateErr : UpdateFailErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.UPDATE_FAIL,
                payload: {
                    msg: updateErr.msg,
                }
            }
            console.log(RES_TYPE.UPDATE_FAIL)
            return res
                    .status(500)
                    .json(response)
        } case InvalidFieldError : {
            const invalidFieldErr : InvalidFieldError = err;
            const response : ErrorResponse = {
                type: RES_TYPE.INVALID_FIELD,
                payload: {
                    msg: invalidFieldErr.msg,
                }
            }
            console.log(RES_TYPE.INVALID_FIELD)
            return res
                    .status(415)
                    .json(response)
        } default : {
            console.log('uncaught error');
            return res.status(500);
        }
    }
}

export default errorHandler;