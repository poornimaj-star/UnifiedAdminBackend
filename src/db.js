
const mysql = require('mysql2/promise');

const chatbotPool = mysql.createPool({
  host: 'qamysqlserver.mysql.database.azure.com',
  user: 'mysql_admin',
  password: 'm@xSqL34',
  database: 'ai_chatbot_config',
  port: 3306,
  ssl: {
    rejectUnauthorized: false  // For testing only
  }
});

const scribePool = mysql.createPool({
  host: 'qamysqlserver.mysql.database.azure.com',
  user: 'mysql_admin',
  password: 'm@xSqL34',
  database: 'scribe_test_eu',
  port: 3306,
  ssl: {
    rejectUnauthorized: false  // For testing only
  }
});

const evaaConfigPool = mysql.createPool({
  host: 'qamysqlserver.mysql.database.azure.com',
  user: 'mysql_admin',
  password: 'm@xSqL34',
  database: 'evaa_config',
  port: 3306,
  ssl: {
    rejectUnauthorized: false  // For testing only
  }
});

module.exports = {
  chatbotPool,
  scribePool,
  evaaConfigPool
};
