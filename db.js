const Database = require('better-sqlite3');
const db = new Database('data.sqlite');
const fs = require('fs');

const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

module.exports = db;
