const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectDB() {
  await client.connect();
  const db = client.db("bulkNEST");
  return {
    productCollection: db.collection("products"),
    orderCollection: db.collection("orders"),
    userCollection: db.collection("users"),
  };
}

module.exports = { connectDB };
