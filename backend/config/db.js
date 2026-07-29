const mongoose = require('mongoose');
const initialData = require('../data/initialData');

// Simple persistent JSON/in-memory database fallback structure
let dbInstance = null;

class LocalDatabase {
  constructor() {
    this.data = JSON.parse(JSON.stringify(initialData));
    console.log("LocalDatabase: Initialized local database with mock seed data.");
  }

  get(collectionName) {
    return this.data[collectionName];
  }

  save(collectionName, item) {
    if (!this.data[collectionName]) {
      this.data[collectionName] = [];
    }
    
    if (item.id || item.code || item.regNo) {
      const uniqueKey = item.id ? 'id' : (item.code ? 'code' : 'regNo');
      const idx = this.data[collectionName].findIndex(x => x[uniqueKey] === item[uniqueKey]);
      if (idx !== -1) {
        this.data[collectionName][idx] = item;
        return item;
      }
    }
    
    this.data[collectionName].push(item);
    return item;
  }

  delete(collectionName, keyName, keyValue) {
    if (!this.data[collectionName]) return false;
    const initialLen = this.data[collectionName].length;
    this.data[collectionName] = this.data[collectionName].filter(x => x[keyName] !== keyValue);
    return this.data[collectionName].length < initialLen;
  }
}

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.warn("MONGO_URI not specified. Falling back to local state database.");
    dbInstance = new LocalDatabase();
    return dbInstance;
  }

  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected Successfully.");
    return null;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}. Falling back to local state database.`);
    dbInstance = new LocalDatabase();
    return dbInstance;
  }
};

const getDB = () => {
  if (!dbInstance) {
    dbInstance = new LocalDatabase();
  }
  return dbInstance;
};

module.exports = { connectDB, getDB };
