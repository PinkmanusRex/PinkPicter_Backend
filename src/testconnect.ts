import mysql from "mysql2";

let connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12231997',
    database: 'music_db',
});

connection.connect((err) => {
    if (err) console.log(err);
    else console.log('connected to server');
})

let connectionPromise = connection.promise();

const fun = async () => {
    const [rows, fields] = await connectionPromise.query("SELECT NULL");
    console.log((rows as any)[0].NULL === null);
}

fun();