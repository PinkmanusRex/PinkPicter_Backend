import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const verifyJWT = async (token: string) => {
    try {
        const payload = await new Promise((resolve, reject) => {
            jwt.verify(token, JWT_SECRET, (err, decoded) => {
                if (err) reject(err);
                resolve(decoded);
            })
        })
        return [payload, null];
    } catch (error) {
        return [null, error];
    }
}

const signJWT = (token: {[key:string]:any}, expiresIn: string) => {
    return jwt.sign(token, JWT_SECRET, {
        expiresIn: expiresIn,
    })
}

export {verifyJWT, signJWT};