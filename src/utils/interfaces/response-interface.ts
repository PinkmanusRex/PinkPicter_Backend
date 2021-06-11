export enum RES_TYPE {
    NOT_FOUND = 'NOT_FOUND',
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED",
    AUTH_SUCCESS = "AUTH_SUCCESS",
    SERVER_ERROR = "SERVER_ERROR",
    REGISTER_ERR = "REGISTER_ERR",
    REGISTER_SUCCESS = "REGISTER_SUCCESS",
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILURE = "LOGIN_FAILURE",
    LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
}

export interface IUser {
    user_name: string,
    profile_pic?: string | null | undefined,
    banner_pic?: string | null | undefined,
}

export interface IPostInfo {
    post_url: string,
    width?: number,
    height?: number,
    favorited?: boolean,
}

export interface IComment {
    poster: IUser,
    comment: string,
}

export interface IPostPayload {
    poster: IUser,
    post: IPostInfo,
    comments: IComment[],
}

export interface ISearchPayload {
    posts: IPostInfo[],
}

export interface IErrPayload {
    msg: string,
}

export interface IVerifyPayload {
    user_name: string,
    banner?: string,
    profile_pic?: string,
}

export interface IResponse< S >{
    type: RES_TYPE,
    payload?: S,
}