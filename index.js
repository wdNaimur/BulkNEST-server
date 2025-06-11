const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const admin = require("firebase-admin");
const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");
var serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://bulknest.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Jwt Middleware
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: "unauthorized access" });
  }
  //firebase Verify token firebase admin sdk
};

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
    app.get("/products/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const email = req.params.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "unauthorized access" });
      } else {
        const allProducts = await productCollection
          .find()
          .sort({ _id: -1 })
          .toArray();
        res.send(allProducts);
      }
    });
    // get  products by categories
    app.get("/categories/:category", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail; // ✅ From your middleware
      const requestEmail = req.query.email; // ✅ From query param
      const category = req.params.category;

      // Optional: check if decoded email and query email match
      if (decodedEmail !== requestEmail) {
        return res.status(403).send({ message: "Forbidden: Email mismatch" });
      }

      const query = { category: category };
      const product = await productCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();

      res.send(product);
    });

    // get single product
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });
    // get product by email
    app.get("/myProducts/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const product = await productCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(product);
    });
    //post a new product
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.status(201).send(result);
    });
    // Update Product
    app.patch("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const updatedDoc = {
        $set: updatedData,
      };
      const result = await productCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    // get order data by email my cart
    app.get("/orders/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const email = req.params.email;
      const query = { orderedFrom: email };
      console.log(email, decodedEmail);
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      if (email === decodedEmail) {
        try {
          const orders = await orderCollection
            .find(query)
            .sort({ _id: -1 })
            .toArray();

          if (!orders.length) {
            return res
              .status(404)
              .send({ message: "No orders found for this email." });
          }

          const fullOrderDetails = await Promise.all(
            orders.map(async (order) => {
              const productQuery = { _id: new ObjectId(order.productId) };
              const productDetails = await productCollection.findOne(
                productQuery
              );
              order.productImage = productDetails.image;
              order.productBrand = productDetails.brand;
              order.productName = productDetails.name;
              order.totalPrice = order.quantity * productDetails.price;
              return order;
            })
          );

          res.send(fullOrderDetails);
        } catch (err) {
          console.error(err);
          res.status(500).send({ message: "Error retrieving orders" });
        }
      }
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
        // console.log("product", product);
        // create order
        orderData.date = new Date();
        const orderResult = await orderCollection.insertOne(orderData);
        console.log("Order Result: ", orderResult);
        // Update productQuantity
        if (orderResult.acknowledged) {
          await productCollection.updateOne(query, {
            $inc: { main_quantity: -quantity },
          });
          res.send({
            success: true,
            message: "Order placed successfully",
            orderId: orderResult.insertedId,
          });
        }
      } catch (err) {
        console.log(err);
      }
    });
    // delete Order
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const orderQuery = { _id: new ObjectId(id) };
      const orderDetails = await orderCollection.findOne(orderQuery);
      const productId = await orderDetails.productId;
      const productQuery = { _id: new ObjectId(productId) };
      const quantity = orderDetails.quantity;
      const result = await orderCollection.deleteOne(orderQuery);
      if (result.deletedCount) {
        console.log("deleted");
        await productCollection.updateOne(productQuery, {
          $inc: { main_quantity: quantity },
        });
      }
      res.send(result);
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
