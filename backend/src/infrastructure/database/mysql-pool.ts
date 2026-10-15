import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'nexus_user',
  password: 'nexus_pass',
  database: 'nexusmarket',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
