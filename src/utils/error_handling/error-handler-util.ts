import { ErrorRequestHandler } from "express";
import {clearOptions} from "../jwt/jwt-util";
import {ImpropImgErr} from "./ImproperImgErr";
import {NotFoundErr} from "./NotFoundErr";
import {AuthFailErr} from "./AuthFailErr";
import {ServErr} from "./ServErr";
import {UpdateFailErr} from "./UpdateFailErr";
import { IResponse, IErrPayload, RES_TYPE } from "../interfaces/response-interface";

type ErrorResponse = IResponse<IErrPayload>;

const errorHandler : ErrorRequestHandler = (err, req, res ,next) => {
    switch (err) {
        case err instanceof ImpropImgErr : {
            const imgErr : ImpropImgErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.INVALID_FIELD,
                payload: {
                    msg: imgErr.msg,
                }
            }
            return res
                    .status(415)
                    .json(response)
        }
        case err instanceof NotFoundErr : {
            const nfErr : NotFoundErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.NOT_FOUND,
                payload: {
                    msg: nfErr.msg,
                }
            }
            return res
                    .status(404)
                    .json(response)
        }
        case err instanceof AuthFailErr : {
            const authErr : AuthFailErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.AUTH_FAILURE,
                payload: {
                    msg: authErr.msg,
                }
            }
            return res
                    .status(401)
                    .clearCookie("access_token", clearOptions)
                    .clearCookie("refresh_token", clearOptions)
                    .json(response)
        }
        case err instanceof ServErr : {
            const srvErr : ServErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.SERVER_ERROR,
                payload: {
                    msg: srvErr.msg,
                }
            }
            return res
                    .status(500)
                    .json(response)
        }
        case err instanceof UpdateFailErr : {
            const updateErr : UpdateFailErr = err;
            const response : ErrorResponse = {
                type: RES_TYPE.UPDATE_FAIL,
                payload: {
                    msg: updateErr.msg,
                }
            }
            return res
                    .status(500)
                    .json(response)
        }
    }
}

export default errorHandler;