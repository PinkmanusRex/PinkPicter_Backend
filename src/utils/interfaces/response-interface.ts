export enum RES_TYPE {
    NOT_FOUND = 'NOT_FOUND',
    AUTH_SUCCESS = "AUTH_SUCCESS",
    AUTH_FAILURE = "AUTH_FAILURE",
    SERVER_ERROR = "SERVER_ERROR",
    REGISTER_ERR = "REGISTER_ERR",
    REGISTER_SUCCESS = "REGISTER_SUCCESS",
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILURE = "LOGIN_FAILURE",
    LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
    INVALID_FIELD = "INVALID_FIELD",
    UPDATE_FAIL = "UPDATE_FAIL",
    POST_SUCCESS = "POST_SUCCESS",
    GET_SUCCESS = "GET_SUCCESS",
}

export interface IUser {
    user_name: string,
    profile_pic?: string | null | undefined,
    banner_pic?: string | null | undefined,
}

export type IProfile = IUser & {summary?: string};

export interface IPostInfo {
    post_pic_url: string,
    post_id: string,
    user: IUser,
    width?: number,
    height?: number,
    description?: string,
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

export interface IResponse< S >{
    type: RES_TYPE,
    payload?: S,
}