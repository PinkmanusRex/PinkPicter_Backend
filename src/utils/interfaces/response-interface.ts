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
    title: string,
    src: string,
    post_id: string,
    user: IUser,
    width?: number,
    height?: number,
    description?: string,
    favorited?: boolean,
    post_date?: Date,
}

export interface IComment {
    comment_id : number,
    poster: IUser,
    post_date : Date,
    comment: string,
}

export interface IPostPayload {
    post: IPostInfo,
    comments: IComment[],
}

export interface ISearchPayload {
    count_pages: number,
    posts: IPostInfo[],
}

export interface IErrPayload {
    msg: string,
}

export interface IResponse< S >{
    type: RES_TYPE,
    payload?: S,
}