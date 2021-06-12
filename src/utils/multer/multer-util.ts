import multer from "multer";
import {ImpropImgErr} from "../error_handling/ImproperImgErr";

export type multerFields = {
    [fieldname: string] : Express.Multer.File[],
}

const memStorage = multer.memoryStorage();

const multerUtil = multer({
    storage: memStorage,
    fileFilter: (req, file, cb) => {
        if (file) {
            if (file.mimetype === 'image/jpeg') {
                cb(null, true)
            } else {
                cb(new ImpropImgErr(file.mimetype));
            }
        } else {
            cb(null, false)
        }
    }
})

export default multerUtil;