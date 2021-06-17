import mysql from "mysql2";
import cloudinaryV2 from "./utils/cloudinary/cloudinary-util";

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

console.log(cloudinaryV2.url('little_nuns/profile/profile_pic'));