const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("bulkNEST");
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");

    // get all product
    app.get("/products", async (req, res) => {
      const allProducts = await productCollection.find().toArray();
      res.send(allProducts);
    });
    // get single product
    app.get("/product/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });
    //post a new product
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.status(201).send(result);
    });
    // Order functionality
    app.post("/orders", async (req, res) => {
      const orderData = req.body;
      const { quantity, buyerDetails } = orderData;
      const id = orderData.productId;
      const query = { _id: new ObjectId(id) };
      console.log(id, quantity, buyerDetails);

      try {
        // find product
        const product = await productCollection.findOne(query);
        console.log("product", product);
        // create order
        orderData.date = new Date();
        const orderResult = await orderCollection.insertOne(orderData);
        // Update productQuantity
        await productCollection.updateOne(query, {
          $inc: { main_quantity: -quantity },
        });
        res.send({
          success: true,
          message: "Order placed successfully",
          orderId: orderResult.insertedId,
        });
      } catch (err) {
        console.log(err);
      }
    });
    // LAST ON TRY BLOCK Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to BulkNEST Server");
});

app.listen(port, () => {
  console.log(`Server Running on http://localhost:${port}`);
});
