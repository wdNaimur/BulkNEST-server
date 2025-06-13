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
  //firebase Verify token firebase admin sdk
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

    // end get all product
    app.get("/products/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const available = req.query.available === "true";

      const email = req.params.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = {};
      if (available) {
        query["$expr"] = {
          $gte: [{ $subtract: ["$main_quantity", "$min_sell_quantity"] }, 100],
        };
      }
      const allProducts = await productCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(allProducts);
    });
    // end get  products by categories
    app.get("/categories/:category", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const requestEmail = req.query.email;
      const category = req.params.category;

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
    // end get single product
    app.get("/product/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const requestEmail = req.query.email;
      if (requestEmail !== decodedEmail) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });
    // end get product by email
    app.get("/myProducts/:email", verifyJWT, async (req, res) => {
      const requestEmail = req.params.email;
      const decodedEmail = req.tokenEmail;
      if (decodedEmail !== requestEmail) {
        return res.status(403).send({ message: "Forbidden: Email mismatch" });
      }
      const query = { userEmail: requestEmail };
      const product = await productCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(product);
    });
    // end post a new product
    app.post("/products/:email", verifyJWT, async (req, res) => {
      const emailFromToken = req.tokenEmail;
      const emailFromParam = req.params.email;

      if (emailFromToken !== emailFromParam) {
        return res.status(403).send({ message: "Unauthorized" });
      }

      const newProduct = req.body;

      try {
        const result = await productCollection.insertOne(newProduct);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error inserting product:", error);
        res.status(500).send({ message: "Server Error" });
      }
    });
    // end Update Product
    app.patch("/product/:id", verifyJWT, async (req, res) => {
      const requestEmail = req.query.email;
      const emailFromToken = req.tokenEmail;
      if (emailFromToken !== requestEmail) {
        return res.status(403).send({ message: "Unauthorized" });
      }
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const updatedDoc = {
        $set: updatedData,
      };
      const result = await productCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    // end get order data by email my cart
    app.get("/orders/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const email = req.params.email;
      const query = { orderedFrom: email };

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
    // end Order functionality
    app.post("/orders/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const email = req.params.email;

      if (email !== decodedEmail) {
        return res
          .status(403)
          .json({ success: false, message: "Unauthorized access" });
      }

      const orderData = req.body;
      const { quantity, productId } = orderData;
      const query = { _id: new ObjectId(productId) };

      try {
        const product = await productCollection.findOne(query);
        if (!product) {
          return res
            .status(404)
            .json({ success: false, message: "Product not found" });
        }

        if (quantity < product.min_sell_quantity) {
          return res.status(400).json({
            success: false,
            message: `You need to buy at least ${product.min_sell_quantity} items.`,
          });
        }

        if (product.main_quantity < quantity) {
          return res.status(400).json({
            success: false,
            message: "Too late, this product is out of stock.",
          });
        }

        // Set order date and create order
        orderData.date = new Date();
        const orderResult = await orderCollection.insertOne(orderData);

        if (orderResult.acknowledged) {
          await productCollection.updateOne(query, {
            $inc: { main_quantity: -quantity },
          });
          return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            orderId: orderResult.insertedId,
          });
        } else {
          return res.status(500).json({
            success: false,
            message: "Failed to place order. Please try again.",
          });
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Internal server error. Please try again later.",
        });
      }
    });

    // end delete Order
    app.delete("/orders/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.tokenEmail;
      const email = req.query.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const id = req.params.id;
      const orderQuery = { _id: new ObjectId(id) };
      const orderDetails = await orderCollection.findOne(orderQuery);
      const productId = await orderDetails.productId;
      const productQuery = { _id: new ObjectId(productId) };
      const quantity = orderDetails.quantity;
      const result = await orderCollection.deleteOne(orderQuery);
      // if (result.deletedCount) {
      //   await productCollection.updateOne(productQuery, {
      //     $inc: { main_quantity: quantity },
      //   });
      // }
      res.send(result);
    });
    // LAST ON TRY BLOCK Send a ping to confirm a successful connection
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
