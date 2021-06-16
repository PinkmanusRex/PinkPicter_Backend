import dotenv from "dotenv";
import mysql from "mysql2";
import path from "path";
import { PoolConnection } from "mysql2/promise";
import { NextFunction } from "express";
import { ServErr } from "../error_handling/ServErr";

dotenv.config({
    path: path.join(__dirname, "../../../.env"),
})

const host = process.env.MYSQL_HOST || 'localhost';
const user = process.env.MYSQL_USER || 'user';
const password = process.env.MYSQL_PASSWORD || 'password';
const db = process.env.MYSQL_DATABASE || 'db';
const connection_limit = process.env.MYSQL_CONNECTION_LIMIT ? parseInt(process.env.MYSQL_CONNECTION_LIMIT) : 10;
const queue_limit = process.env.MYSQL_QUEUE_LIMIT ? parseInt(process.env.MYSQL_QUEUE_LIMIT) : 0;

const pool_original = mysql.createPool({
    host: host,
    user: user,
    database: db,
    password: password,
    waitForConnections: true,
    connectionLimit: connection_limit,
    queueLimit: queue_limit,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
})

const mysql_pool = pool_original.promise();

export const query_helper = async (connection: PoolConnection, query: string, values: any[]) : Promise<[any, mysql.QueryError | null]> => {
    try {
        const [results, fields] = await connection.query(query, values);
        return [results, null];
    } catch (error) {
        return [null, error];
    }
}

export const transaction_helper = async (connection: PoolConnection) => {
    try {
        await connection.beginTransaction();
        return null;
    } catch (e) {
        return e;
    }
}

export const rollback_helper = async (connection: PoolConnection, next: NextFunction, loopController: {current: boolean}) => {
    try {
        await connection.rollback();
    } catch (e) {
        console.log("Encountered rollback error");
        loopController.current = false;
        await connection.release();
        return next(new ServErr("Encountered a database error"));
    }
}

export const commit_helper = async (connection: PoolConnection, next: NextFunction, loopController: {current: boolean}) => {
    try {
        await connection.commit();
    } catch (e) {
        console.log("Encountered a commit error");
        await rollback_helper(connection, next, loopController);
        if (!loopController.current) return;
        await connection.release();
        return next(new ServErr("Encountered a database error"));
    }
}

export const connection_release_helper = async (connection: PoolConnection, next: NextFunction, err?: Error, res?: any) => {
    if (err) {
        await connection.release();
        return next(err);
    } else {
        await connection.release();
        return;
    }
}

export default mysql_pool;