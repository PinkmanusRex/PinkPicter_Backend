export class InvalidFieldError extends Error {
    constructor(public msg: string) {
        super();

        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any)._proto_ = actualProto;
        }
    }
}