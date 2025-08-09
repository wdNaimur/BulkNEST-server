// server.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Import routes
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");

// Import DB and controllers to inject collections
const { connectDB } = require("./models/db");
const productController = require("./controllers/productController");
const orderController = require("./controllers/orderController");
const userController = require("./controllers/userController");

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://bulknest.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Connect to DB and inject collections before starting server
connectDB()
  .then(({ productCollection, orderCollection, userCollection }) => {
    productController.setProductCollection(productCollection);
    orderController.setCollections(orderCollection, productCollection);
    userController.setUserCollection(userCollection);

    // Routes
    app.use("/", productRoutes);
    app.use("/", orderRoutes);
    app.use("/", userRoutes);

    app.get("/", (req, res) => {
      res.send("Welcome to BulkNEST Server");
    });

    app.listen(port, () => {
      console.log(`🚀 Server Running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to database", err);
  });
