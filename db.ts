// d:\Unified-admin\backend\db.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'qamysqlserver.mysql.database.azure.com',
  user: 'mysql_admin',
  password: 'm@xSqL34',
  database: 'ai_chatbot_config',
  port: 3306,
  ssl: { rejectUnauthorized: true }
});

export default pool;
