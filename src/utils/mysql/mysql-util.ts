import dotenv from "dotenv";
import mysql from "mysql2";
import path from "path";
import { PoolConnection } from "mysql2/promise";

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
    password: password,
    waitForConnections: true,
    connectionLimit: connection_limit,
    queueLimit: queue_limit,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
})

const mysql_pool = pool_original.promise();

const query_helper = async (connection: PoolConnection, query: string, values: any[])  => {
    try {
        const [results, fields] = await connection.query(query, values);
        return [results, null];
    } catch (error) {
        return [null, error];
    }
}

export {query_helper};

export default mysql_pool;