enum RES_TYPE {
    NOT_FOUND = 'NOT_FOUND',
}

interface IResponse {
    type: RES_TYPE,
    payload?: any
}

export type {IResponse};
export {RES_TYPE};