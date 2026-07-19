const { MongoClient } = require('mongodb');
require('dotenv').config();

let client = null;
let db = null;

async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in the environment.');
  }

  if (!client) {
    client = new MongoClient(uri);
  }

  await client.connect();
  console.log('Connected to MongoDB successfully');
  db = client.db();
  return db;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed.');
  }
}

module.exports = { connectDB, getDB, closeDB };
