import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

if (fs.existsSync('.env')) {
  config();
}

const useSSL = process.env.PG_SSL === 'true';


const ssl = useSSL
  ? {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.resolve(process.env.PG_SSL_CA || 'certs/CA.crt')).toString(),
      key: fs.readFileSync(path.resolve(process.env.PG_SSL_KEY || 'certs/server.key')).toString(),
      cert: fs.readFileSync(path.resolve(process.env.PG_SSL_CERT || 'certs/server.crt')).toString(),
      servername: process.env.PG_SERVERNAME || 'localhost',
    }
  : false;

// console.log(process.env.PG_HOST);

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
  ssl: ssl,
});

export default pool;