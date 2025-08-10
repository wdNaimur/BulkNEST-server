const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://bulknest.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// JWT Middleware using Firebase Admin SDK
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decodedToken.email;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).send({ message: "unauthorized access" });
  }
};

// MongoDB Client setup
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
    const userCollection = database.collection("users");

    // ----- PRODUCT ROUTES -----

    // Get all products for an authenticated user (optional availability filter)
    app.get("/products", async (req, res) => {
      try {
        const available = req.query.available === "true";
        const query = {};
        if (available) {
          query["$expr"] = { $gte: ["$main_quantity", "$min_sell_quantity"] };
        }
        const allProducts = await productCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();
        res.send(allProducts);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get products" });
      }
    });

    // Get products by category for authenticated user
    app.get("/categories/:category", verifyJWT, async (req, res) => {
      try {
        const decodedEmail = req.tokenEmail;
        const requestEmail = req.query.email;
        if (decodedEmail !== requestEmail) {
          return res.status(403).send({ message: "Forbidden: Email mismatch" });
        }
        const category = req.params.category;
        const products = await productCollection
          .find({ category })
          .sort({ _id: -1 })
          .toArray();
        res.send(products);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get category products" });
      }
    });

    // Get single product by ID, secured
    app.get("/product/:id", verifyJWT, async (req, res) => {
      try {
        const decodedEmail = req.tokenEmail;
        const requestEmail = req.query.email;
        if (requestEmail !== decodedEmail) {
          return res.status(403).send({ message: "unauthorized access" });
        }
        const id = req.params.id;
        const product = await productCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(product);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get product" });
      }
    });

    // Get all products belonging to a seller
    app.get("/myProducts/:email", verifyJWT, async (req, res) => {
      try {
        const requestEmail = req.params.email;
        const decodedEmail = req.tokenEmail;
        if (decodedEmail !== requestEmail) {
          return res.status(403).send({ message: "Forbidden: Email mismatch" });
        }
        const products = await productCollection
          .find({ sellerEmail: requestEmail }) // unified sellerEmail field
          .sort({ _id: -1 })
          .toArray();
        res.send(products);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get user products" });
      }
    });

    // Create a new product
    app.post("/products/:email", verifyJWT, async (req, res) => {
      try {
        const emailFromToken = req.tokenEmail;
        const emailFromParam = req.params.email;
        if (emailFromToken !== emailFromParam) {
          return res.status(403).send({ message: "Unauthorized" });
        }
        const newProduct = req.body;
        const result = await productCollection.insertOne(newProduct);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error inserting product:", error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // Update product
    app.patch("/product/:id", verifyJWT, async (req, res) => {
      try {
        const requestEmail = req.query.email;
        const emailFromToken = req.tokenEmail;
        if (emailFromToken !== requestEmail) {
          return res.status(403).send({ message: "Unauthorized" });
        }
        const id = req.params.id;
        const existingProduct = await productCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!existingProduct) {
          return res.status(404).send({ message: "Product not found" });
        }
        if (existingProduct.sellerEmail !== emailFromToken) {
          return res
            .status(403)
            .send({ message: "You are not the owner of this product" });
        }
        const updatedData = req.body;
        const result = await productCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update product" });
      }
    });

    // Delete product
    app.delete("/product/:id", verifyJWT, async (req, res) => {
      try {
        const requestEmail = req.query.email;
        const emailFromToken = req.tokenEmail;
        if (emailFromToken !== requestEmail) {
          return res.status(403).send({ message: "Unauthorized" });
        }
        const id = req.params.id;
        const existingProduct = await productCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!existingProduct) {
          return res.status(404).send({ message: "Product not found" });
        }
        if (existingProduct.sellerEmail !== emailFromToken) {
          return res
            .status(403)
            .send({ message: "You are not the owner of this product" });
        }
        const result = await productCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to delete product" });
      }
    });

    // ----- ORDER ROUTES -----

    // Get orders by customer email
    app.get("/orders/:email", verifyJWT, async (req, res) => {
      try {
        const decodedEmail = req.tokenEmail;
        const email = req.params.email;
        if (email !== decodedEmail) {
          return res.status(403).send({ message: "unauthorized access" });
        }

        const orders = await orderCollection
          .find({ orderedFrom: email })
          .sort({ _id: -1 })
          .toArray();

        // Optional: return empty array instead of 404 if no orders
        // if (!orders.length) return res.status(404).send({ message: "No orders found" });

        const fullOrderDetails = await Promise.all(
          orders.map(async (order) => {
            const productDetails = await productCollection.findOne({
              _id: new ObjectId(order.productId),
            });
            if (productDetails) {
              order.productImage = productDetails.image;
              order.productBrand = productDetails.brand;
              order.productName = productDetails.name;
              order.totalPrice = order.quantity * productDetails.price;
            }
            return order;
          })
        );

        res.send(fullOrderDetails);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error retrieving orders" });
      }
    });

    // Create new order
    app.post("/orders/:email", verifyJWT, async (req, res) => {
      try {
        const decodedEmail = req.tokenEmail;
        const email = req.params.email;
        if (email !== decodedEmail) {
          return res
            .status(403)
            .json({ success: false, message: "Unauthorized access" });
        }

        const orderData = req.body;
        const { quantity, productId } = orderData;
        const product = await productCollection.findOne({
          _id: new ObjectId(productId),
        });

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

        orderData.date = new Date();
        orderData.sellerEmail = product.sellerEmail; // Attach sellerEmail for convenience

        const orderResult = await orderCollection.insertOne(orderData);

        if (orderResult.acknowledged) {
          await productCollection.updateOne(
            { _id: new ObjectId(productId) },
            { $inc: { main_quantity: -quantity } }
          );
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
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Internal server error. Please try again later.",
        });
      }
    });

    // Delete order
    app.delete("/orders/:id", verifyJWT, async (req, res) => {
      try {
        const decodedEmail = req.tokenEmail;
        const email = req.query.email;
        const type = req.query.type;

        if (email !== decodedEmail) {
          return res.status(403).send({ message: "unauthorized access" });
        }

        const id = req.params.id;
        const orderDetails = await orderCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!orderDetails) {
          return res.status(404).send({ message: "Order not found" });
        }

        const productId = orderDetails.productId;
        const quantity = orderDetails.quantity;

        const result = await orderCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount && type === "cancel") {
          await productCollection.updateOne(
            { _id: new ObjectId(productId) },
            { $inc: { main_quantity: quantity } }
          );
        }

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to delete order" });
      }
    });

    // ----- USER ROUTES -----

    // Create or update user
    app.post("/user", async (req, res) => {
      try {
        const userData = req.body;
        const query = { email: userData.email };
        const existingUser = await userCollection.findOne(query);

        if (existingUser) {
          const result = await userCollection.updateOne(query, {
            $set: { lastLoggedIn: new Date().toISOString() },
          });
          return res.send(result);
        } else {
          userData.role = "customer";
          userData.createdAt = new Date().toISOString();
          userData.lastLoggedIn = new Date().toISOString();
          const result = await userCollection.insertOne(userData);
          res.status(201).json(result);
        }
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Get user role by email
    app.get("/user/role/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send({ role: user.role });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get user role" });
      }
    });

    // Get all users (optional admin only in future)
    app.get("/users", async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.json(users);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get users" });
      }
    });

    // Root route
    app.get("/", (req, res) => {
      res.send("Welcome to BulkNEST Server");
    });
  } catch (err) {
    console.error("Error in run function:", err);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`🚀 Server Running on http://localhost:${port}`);
});
