import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.APP_MODE === "prod";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: isProd
    ? process.env.DB_USER_LIVE
    : process.env.DB_USER_DEV || "root",
  password: isProd
    ? process.env.DB_USER_PASS_LIVE
    : process.env.DB_USER_PASS_DEV || "",
  database: isProd
    ? process.env.DB_NAME_LIVE
    : process.env.DB_NAME_DEV || "tutorial_management_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
