const mongoose = require("mongoose");

// On Vercel, each serverless invocation can reuse a "warm" instance of
// this module between requests - so we cache the connection instead of
// opening a brand new one every time, which would otherwise exhaust
// MongoDB Atlas's connection limit very quickly under real traffic.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in your .env file");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((mongooseInstance) => {
      console.log("MongoDB connected");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow a retry on the next request
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }

  return cached.conn;
}

module.exports = connectDB;
