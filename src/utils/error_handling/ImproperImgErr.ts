export class ImpropImgErr extends Error {
    msg : string;
    constructor(mimeType: string) {
        super();

        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any)._proto_ = actualProto;
        }

        this.msg = `Incorrect file format: Expected image/jpeg, got ${mimeType}`;

    }
}