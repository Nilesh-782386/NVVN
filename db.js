import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Nilesh@123',
  database: process.env.DB_NAME || 'ngo_website',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add these to ensure clean JSON output
  stringifyObjects: true,
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true
});

// Method to connect to the database
const connect = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to MySQL database");
    connection.release(); // release back to pool
  } catch (err) {
    console.error("Error connecting to the database:", err);
    throw err; // Important: re-throw the error
  }
};

// Method to disconnect from the database
const disconnect = async () => {
  try {
    await pool.end();
    console.log("Disconnected from the database");
  } catch (err) {
    console.error("Error disconnecting from the database:", err);
  }
};

// ✅ FIXED: Helper method to execute queries - Return clean JSON objects
const query = async (text, params) => {
  const connection = await pool.getConnection();
  try {
    const [rows, fields] = await connection.execute(text, params);
    // Return only the clean rows, not the raw protocol data
    return rows;
  } finally {
    connection.release();
  }
};

export { pool, connect, disconnect, query };